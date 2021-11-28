export enum signalTypes{
    GET_ID= "GET-ID",
  
    SIGNAL = "SIGNAL",
  
    DISCONNECT = "DISCONNECTEDUSER",
    ERROR = "TYPEERROR",

    JOIN_ROOM = "JOIN-ROOM",
    CREATE_ROOM = "CREATE-ROOM",
    UPDATE_ROOM = "UPDATE-ROOM"
  }
export enum Errors{
    UNSPECIFIED,
    INVALID_PASSWORD,
    LIMIT_REACHED,
    NO_SUCH_ROOM,
    ROOM_ERROR
}
export enum RoomType {
    P2PMesh,
    SFPServer
}