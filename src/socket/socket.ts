import { Server } from 'socket.io';
import {RoomService} from "../service/room.service.js";
import {SECONDS_FOR_GAME, SECONDS_TIMER_BEFORE_START_GAME} from "./config.js";
import {texts} from "../data.js";

const roomService = new RoomService();
let clients: string[] = []
const getCurrentRoom = socket => roomService.getRooms().find(room => socket.rooms.has(room.id));


export default (io: Server) => {
    io.on('connection', socket => {
        const username = socket.handshake.query.username;
        if (clients.includes(username)) {
            socket.emit('USER_WITH_SAME_NAME_ALREADY_EXIST', `user with username ${username} has already connected`)
            return
        } else {
            clients.push(username)
        }

        socket.emit('UPDATE_ROOMS', roomService.getRooms());
        socket.on('CREATE_ROOM', ({roomName}) => {
            try {
                const room = roomService.createRoom(roomName)
                roomService.joinRoom(room.id, username)
                socket.join(room.id);
                io.emit("UPDATE_ROOMS", roomService.getRooms());
                io.to(room.id).emit('JOIN_ROOM_DONE', room)
            } catch (e: RoomWithSameNameAlreadyExistException) {
                socket.emit('ROOM_WITH_SAME_NAME_ALREADY_EXIST', e.message)
            }
        });
        socket.on('JOIN_ROOM', (roomId) => {
            const prevRoom = getCurrentRoom(socket)

            if (prevRoom && roomId === prevRoom.id) {
                return;
            }
            if (prevRoom && prevRoom.id) {
                socket.leave(prevRoom.id);
            }


            const room = roomService.joinRoom(roomId, username)
            socket.join(room.id)

            io.to(room.id).emit('JOIN_ROOM_DONE', room)
            io.emit("UPDATE_ROOMS", roomService.getRooms());
        })

        socket.on('LEAVE_ROOM', () => {
            const currentRoom = getCurrentRoom(socket)
            if (currentRoom) {
                roomService.leaveRoom(currentRoom.id, username);
                socket.leave(currentRoom.id);
                io.emit("UPDATE_ROOMS", roomService.getRooms());
                io.to(currentRoom.id).emit('UPDATE_CURRENT_ROOM', currentRoom);
            }
        });

        socket.on('UPDATE_READY', (ready) => {
            const currentRoom = getCurrentRoom(socket)
            if (currentRoom) {
                roomService.updateUserReadyState(currentRoom.id, username, ready);
                io.to(currentRoom.id).emit('UPDATE_CURRENT_ROOM', currentRoom);
                if (roomService.isAllUsersReady(currentRoom.id)) {
                    const randomTextId = Math.floor(Math.random() * texts.length);
                    io.to(currentRoom.id).emit("START_TIMER", SECONDS_TIMER_BEFORE_START_GAME, currentRoom, randomTextId);
                }
            }
        })

        socket.on('INIT_GAME', () => {
            const currentRoom = getCurrentRoom(socket);
            currentRoom.gameInProgress = true;
            socket.emit('START_GAME', SECONDS_FOR_GAME);
            io.emit("UPDATE_ROOMS", roomService.getRooms());
        })

        socket.on('UPDATE_PROGRESS', (progress) => {
            const currentRoom = getCurrentRoom(socket);

            roomService.updateUserProgress(currentRoom.id, username, progress);
            io.to(currentRoom.id).emit('UPDATE_CURRENT_ROOM', currentRoom);

            if (roomService.isAllUsersCompleted(currentRoom.id)) {
                io.to(currentRoom.id).emit('FINISH_GAME', currentRoom)
                roomService.finishGame(currentRoom.id);
            }
        })

        socket.on('GAME_TIMEOUT', () => {
            const currentRoom = getCurrentRoom(socket);
            io.to(currentRoom.id).emit('FINISH_GAME', currentRoom)
            roomService.finishGame(currentRoom.id);
            io.to(currentRoom.id).emit('UPDATE_CURRENT_ROOM', currentRoom);
        })

        socket.on('disconnecting', () => {
            clients = clients.filter(name => username !== name)
            const currentRoom = getCurrentRoom(socket)
            if (currentRoom) {
                roomService.leaveRoom(currentRoom.id, username);
                socket.leave(currentRoom.id);
                io.emit("UPDATE_ROOMS", roomService.getRooms());
                io.to(currentRoom.id).emit('UPDATE_CURRENT_ROOM', currentRoom);
            }
        })
    });
};
