class ExceedMaxUsersForOneRoomException extends Error {
    constructor(message: string) {
        super(message);
    }
}