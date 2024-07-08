import {Room} from "../model/room.js";
import {randomUUID} from "crypto";
import {MAXIMUM_USERS_FOR_ONE_ROOM} from "../socket/config.js";

export class RoomService {
    private rooms: Room[];

    constructor() {
        this.rooms = [];
    }

    createRoom(roomName: string): Room {
        if (this.rooms.find((room) => room.name === roomName)) {
            throw new RoomWithSameNameAlreadyExistException(`Room with name ${roomName} already exists`);
        }

        const room = {
            id: randomUUID(),
            name: roomName,
            numberOfUsers: 0,
            users: [],
            gameInProgress: false
        };

        this.rooms.push(room);
        return room;
    }

    getRooms(): Room[] {
        return this.rooms;
    }

    getRoom(id: string): Room {
        return this.rooms.find((room) => room.id === id);
    }

    joinRoom(id: string, username: string): Room {
        const room = this.getRoom(id);
        if (room.numberOfUsers > MAXIMUM_USERS_FOR_ONE_ROOM) {
            throw new ExceedMaxUsersForOneRoomException('The room has reached the limit of the number of maximally connected users')
        }
        room.numberOfUsers = room.numberOfUsers + 1;
        room.users.push({username: username, ready: false})
        return room;
    }

    leaveRoom(id: string, username: string): boolean {
        const room = this.getRoom(id);
        room.numberOfUsers = room.numberOfUsers - 1;
        if (room.numberOfUsers <= 0) {
            this.rooms = this.rooms.filter((room) => room.id !== id);
            return false;
        }
        room.users = room.users.filter(user => user.username !== username);
        return true;
    }

    updateUserReadyState(id: string, username: string, ready: boolean) {
        const room = this.getRoom(id);
        const user = room.users.find(user => user.username === username);
        user.ready = ready
    }

    isAllUsersReady(id: string): boolean {
        const room = this.getRoom(id);
        return room.users.every(user => user.ready)
    }

    isAllUsersCompleted(id: string): boolean {
        const room = this.getRoom(id);
        return room.users.every(user => user.progress === 100)
    }

    updateUserProgress(roomId: string, username: string, progress:number) {
        const room = this.getRoom(roomId);
        const user = room.users.find(user => user.username === username);
        user.progress = progress
    }

    finishGame(roomId: string) {
        const room = this.getRoom(roomId);
        room.gameInProgress = false;
        room.users.forEach(user => {
            user.ready = false;
            user.progress = 0;
        })
    }
}