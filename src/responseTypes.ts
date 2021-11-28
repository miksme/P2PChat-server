import {Errors, RoomType} from './types';
export class RequestResponses {
    public static returnGetIDToUser(requestID: string, userID: string){
        return {requestID:requestID, userID: userID};
    }
    public static returnCreateRoomToUser(roomID:string, requestID: string, password: string,name:string, maxUsers:number,curUsers:number,){
        return {roomID: roomID, requestID: requestID, name:name, maxUsers:maxUsers,curUsers:curUsers, password:password};
    }
    public static returnJoinRoomToUser(requestID: string, name:string, maxUsers:number,curUsers:number, type: RoomType, spec:any){
        return {requestID:requestID, name:name, maxUsers:maxUsers,curUsers:curUsers, type: type, spec:spec};
    }
    public static returnErrorToUser(requestID: string, error: Errors){
        return {type: error, requestID:requestID};
    }


    public static returnUserDisconnect(userID: string, roomID: string){
        return {userID: userID, roomID: roomID}
    }
    public static returnRoomUpdate(requestID: string,password: string, name:string, maxUsers:number,curUsers:number,){
        return {requestID:requestID,password:password, name:name, maxUsers:maxUsers,curUsers:curUsers, }
    }
    public static returnJoinRoom(userID: string, roomID: string){
        return {from: {userID: userID,roomID: roomID}};
    }
}