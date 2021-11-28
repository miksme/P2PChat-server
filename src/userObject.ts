import { Socket } from 'socket.io';
export class roomUser{
    public joinedRooms: Set<string> = new Set();
    constructor(public userID: string, public socket: Socket){

    }
    addRoom(roomId:string){
        if(!this.joinedRooms.has(roomId)){
            this.joinedRooms.add(roomId);
            return true;
        }
        else{
            return false;
        }
    }
    removeRoom(roomId: string){
        return this.joinedRooms.delete(roomId);
    }
}