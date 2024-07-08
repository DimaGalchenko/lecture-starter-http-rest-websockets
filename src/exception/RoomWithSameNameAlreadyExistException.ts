class RoomWithSameNameAlreadyExistException extends Error {
    constructor(message:string) {
        super(message);
    }
}