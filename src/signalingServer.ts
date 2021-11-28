import { Server as Srv } from "http";
import { Server as Srv2 } from "https";
import { Server, Socket } from "socket.io";
import * as config from './config/config';
import {signalTypes, RoomType, Errors} from './types';
import {v4 as uuidv4} from 'uuid';
import { roomUser } from "./userObject";

import {RequestResponses} from './responseTypes'

export class SignalingServer{

    roomData = new Map<string,{password:string,name:string, maxUsers: number, curUsers: number, type: RoomType, special: any}>();
    userData = new Map<string, roomUser>();
    io:Server|undefined;
    constructor (server: Srv|Srv2){
      this.io = new Server(server, {path: config.default.SIGNALING_PATH});
      this.io.on('connection', (socket: Socket)=> {
        try{
          
            socket.on(signalTypes.GET_ID, (data:any)=>this.type_GET_ID(socket,data));

            socket.on(signalTypes.SIGNAL, (data:any)=>this.type_SIGNAL(socket,data));

            socket.on(signalTypes.DISCONNECT, (data:any)=>this.type_DISCONNECT(socket,data));
            socket.on(signalTypes.JOIN_ROOM, (data:any)=>this.type_JOINROOM(socket,data));
            socket.on(signalTypes.CREATE_ROOM, (data:any)=>this.type_CREATEROOM(socket,data));            
            socket.on(signalTypes.UPDATE_ROOM, (data:any)=>this.type_UPDATEROOM(socket,data)); 

            socket.on('disconnect', ()=> {
              let a  = this.userData.get(socket.id);
              if(a){
                a.joinedRooms.forEach(key => this.type_DISCONNECT(socket, key));
                this.userData.delete(socket.id);
              }
              
            });
            //this.roomData.set('test', {password:'', name: 'testServer', maxUsers:20, curUsers:0, type: RoomType.P2PMesh, special:undefined});

        }
        catch(e){
          console.log("ERROR ENCOUNTERED");
          console.log(e);
      }});
      
    }

    private type_GET_ID(socket: Socket, data:{requestId: string}):void{
      let rid = this.preProcId(data.requestId);
      if((!this.userData.has(socket.id))&&rid){ 
        this.userData.set(socket.id, new roomUser(socket.id, socket));
        console.log(`New user, ID: ${socket.id}`)
        socket.emit(signalTypes.GET_ID, RequestResponses.returnGetIDToUser(rid, socket.id))
      }
    }
    /**
     * SIGNAL handler currently for all types of signals
     * @param socket Socket of the client
     * @param data Data to pass trough
     */
    private type_SIGNAL(socket: Socket, data:{source: string, target:string, room:string ,signal:any}):void{
      try{
        let localID = socket.id;
        data.source = localID;
        let cc = this.userData.get(data.target)
        if(cc && localID != data.target &&this.roomData.has(data.room) && this.userData.get(data.target)?.joinedRooms.has(data.room) && this.userData.get(localID)?.joinedRooms.has(data.room)){
          console.log(`${data.signal.type} : ${socket.id} -> ${data.target}`)
          cc.socket.emit(signalTypes.SIGNAL, data);
        }else {console.log(`${localID} attempted to connect to a non-existent user`)}
        
      }
      catch(e){
        console.log('ERROR')
      }
    }
    private type_DISCONNECT(socket: Socket,room:string):void{
      let a = this.roomData.get(room);
      if(a){
        if(a.type === RoomType.SFPServer && a.special === socket.id){
          this.roomData.delete(room);
          this.userData.forEach(v => v.removeRoom(room))
          this.io?.to(room).emit(signalTypes.DISCONNECT, RequestResponses.returnUserDisconnect(socket.id, room))
          this.io?.socketsLeave(room);
        }
        else{
          a.curUsers-=1;
          socket.leave(room);
          if(a.curUsers <= 0){
            this.roomData.delete(room);
          }else{
            if(a.type === RoomType.SFPServer){
              this.userData.get(a.special)?.socket.emit(signalTypes.DISCONNECT, RequestResponses.returnUserDisconnect(socket.id, room))
            }
            else{
              this.io?.to(room).emit(signalTypes.DISCONNECT, RequestResponses.returnUserDisconnect(socket.id, room))
            }
            
          }
        }
      }
    }

    private type_CREATEROOM(socket: Socket,data:{requestId: string, maxUsers: number, name: string, password:string, type: RoomType}):void{
      let rid = this.preProcId(data.requestId);
      if(rid){
        try {
          let roomD = this.createRoomDataProc(data.name, data.password, data.maxUsers, data.type);
          if(roomD){
            let spec:any = undefined;
            if(data.type === RoomType.SFPServer){
              spec = socket.id;
            }
            let a = {password: roomD.password,name:roomD.name, maxUsers:roomD.maxUsers, curUsers: 1, type: data.type, special: spec}
            let b = uuidv4();
            while(this.roomData.has(b)){
              //On the minuscule off-chance that the generated UUID somehow already is registered
              b = uuidv4();
            }
            if(this.userData.get(socket.id)?.addRoom(b))
            {
              this.roomData.set(b, a);
              socket.join(b);
              socket.emit(signalTypes.CREATE_ROOM, RequestResponses.returnCreateRoomToUser(b, rid, data.password, data.name, data.maxUsers, 1))
              }
            else{
              socket.emit(signalTypes.ERROR, RequestResponses.returnErrorToUser(rid, Errors.ROOM_ERROR))
            }
          }
          else{
            socket.emit(signalTypes.ERROR, RequestResponses.returnErrorToUser(rid, Errors.ROOM_ERROR))
          }
  
          
        }catch(e){
          socket.emit(signalTypes.ERROR, RequestResponses.returnErrorToUser(rid, Errors.ROOM_ERROR))
          console.log('Error at CREATEROOM')
          console.log(e);
        }
      }
      
    }

    private type_JOINROOM(socket: Socket,data:{requestId: string, room: string, password: string}):void{
      let rid = this.preProcId(data.requestId);
      if(rid){
        try {
          let c = this.roomData.get(data.room);
          let k = this.userData.get(socket.id);
          
          if(c && k){
            let d = k.joinedRooms;
            if(!d.has(data.room))
              if(c.maxUsers>c.curUsers && c.password===data.password){
                c.curUsers+=1;
                d.add(data.room);
                socket.join(data.room);
                socket.emit(signalTypes.JOIN_ROOM, RequestResponses.returnJoinRoomToUser(rid, c.name, c.maxUsers, c.curUsers, c.type, c.special))
                switch(c.type){
                  case RoomType.P2PMesh:
                    socket.to(data.room).emit(signalTypes.JOIN_ROOM, RequestResponses.returnJoinRoom(socket.id, data.room))
                    break;
                  case RoomType.SFPServer:
                    this.io?.to(c.special).emit(signalTypes.JOIN_ROOM, RequestResponses.returnJoinRoom(socket.id, data.room))
                    break;
                }
              }
              else {
                if(c.password!==data.password){
                  socket.emit(signalTypes.ERROR, RequestResponses.returnErrorToUser(rid, Errors.INVALID_PASSWORD))
                }
                else{
                  socket.emit(signalTypes.ERROR, RequestResponses.returnErrorToUser(rid, Errors.LIMIT_REACHED))
                }
                
              }
          }
          else {
            socket.emit(signalTypes.ERROR, RequestResponses.returnErrorToUser(rid, Errors.NO_SUCH_ROOM))
          }
        }catch(e){
          socket.emit(signalTypes.ERROR, RequestResponses.returnErrorToUser(rid, Errors.ROOM_ERROR))
          console.log('Error at JOINROOM')
          console.log(e);
        }
      }
    }
    private type_UPDATEROOM(socket: Socket,data:{requestId: string, room: string, maxUsers: number, name: string, password:string}):void{
      let rid = this.preProcId(data.requestId);
      if(rid){
        let a =this.roomData.get(data.room);  
        if(a){
            if(a.type === RoomType.SFPServer&&a.special === socket.id){
              let rData = this.createRoomDataProc(data.name, data.password, data.maxUsers, RoomType.SFPServer);
              if(rData){
                a.maxUsers = rData.maxUsers;
                a.name = rData.name;
                a.password = rData.password;
                socket.emit(signalTypes.UPDATE_ROOM, RequestResponses.returnRoomUpdate(rid, rData.password, rData.name, rData.maxUsers, a.curUsers))
              }
            }else{
              socket.emit(signalTypes.ERROR, RequestResponses.returnErrorToUser(data.requestId, Errors.ROOM_ERROR))
            }
        }
        else{
          socket.emit(signalTypes.ERROR, RequestResponses.returnErrorToUser(data.requestId, Errors.NO_SUCH_ROOM))
        }
      }
    }
    private preProcId(requestId: string){
      return requestId.length<=10?requestId:undefined;
    }
    private createRoomDataProc(name: string, pwd:string, maxUsers: number, type: RoomType){
      if(type===RoomType.P2PMesh||type===RoomType.SFPServer){
        maxUsers = Math.min(Math.max(maxUsers,0),20)
        name = name.length>20?name.substring(0,20):name;
        pwd = pwd.length>100?pwd.substring(0,100):pwd;
        console.log(`${name} -> ${pwd}`)
        return {name: name, password: pwd, maxUsers: maxUsers};
      }
      return undefined
    }
}