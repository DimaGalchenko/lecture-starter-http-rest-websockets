import {showInputModal, showMessageModal, showResultsModal} from "./views/modal.mjs";
import {appendRoomElement} from "./views/room.mjs";
import {appendUserElement, changeReadyStatus, removeUserElement, setProgress} from "./views/user.mjs";
import {showGamePage, showRoomsPage} from "./helpers/page-selector.mjs";
import {addClass, removeClass} from "./helpers/dom-helper.mjs";
import {fetchData} from "./helpers/fetch-helper.mjs";

const username = sessionStorage.getItem('username');

if (!username) {
    window.location.replace('/signin');
}

const socket = io('http://localhost:3001', {query: {username}});

socket.on('USER_WITH_SAME_NAME_ALREADY_EXIST', (arg) => {
    sessionStorage.removeItem('username')
    showMessageModal({
        message: arg,
        onClose: () => window.location.replace('/signin')
    });
})


function updateRooms(rooms) {
    const roomContainer = document.getElementById('rooms-wrapper');
    const roomElements = rooms
        .filter(room => !room.gameInProgress)
        .map(room => appendRoomElement({
            name: room.name,
            numberOfUsers: room.numberOfUsers,
            onJoin: () => joinRoom({id: room.id})
        }));
    roomContainer.innerText = '';
    roomContainer.append(...roomElements);
}

socket.on('UPDATE_ROOMS', updateRooms);


function updateCurrentRoom(room) {
    const userElements = document.getElementsByClassName('user')
    for (let i = 0; i < userElements.length; i++) {
        const usernameAttrVal = userElements[i].attributes.getNamedItem('data-username').value;
        const user = room.users.find(user => user.username === usernameAttrVal);
        if (!user) {
            removeUserElement(usernameAttrVal);
            return;
        }
        changeReadyStatus({username: user.username, ready: user.ready});
        setProgress({username: user.username, progress: user.progress})
    }
}

socket.on('UPDATE_CURRENT_ROOM', updateCurrentRoom);

const createRoomButton = document.getElementById('add-room-btn');

function createRoom() {
    let roomName;

    showInputModal({
        title: 'Create room',
        onChange: value => roomName = value,
        onSubmit: () => {
            socket.emit('CREATE_ROOM', {roomName: roomName})
        }
    })
}

createRoomButton.addEventListener('click', createRoom);

function leaveRoom(id) {
    socket.emit('LEAVE_ROOM', id)
    showRoomsPage()
}

function joinRoom({id}) {
    socket.emit('JOIN_ROOM', id)
}

function updateReadyState() {
    const newReadyState = readyButton.innerText === 'READY';
    socket.emit('UPDATE_READY', newReadyState)
    readyButton.innerText = newReadyState ? 'NOT_READY' : 'READY';
    changeReadyStatus({username: username, ready: newReadyState})
}


const readyButton = document.getElementById('ready-btn')
readyButton.addEventListener('click', updateReadyState);

function displayRoom({id, name, users}) {
    showGamePage()
    const roomNameElement = document.getElementById('room-name');
    roomNameElement.innerText = name;
    document.getElementById('users-wrapper').innerHTML = '';
    users.forEach(user => {
        appendUserElement({
            username: user.username,
            ready: user.ready,
            isCurrentUser: user.username === username
        })
    })
    const backButton = document.getElementById('quit-room-btn')
    backButton.addEventListener('click', () => leaveRoom(id))
}

socket.on('JOIN_ROOM_DONE', displayRoom);


async function startGameProgress(roomId, data) {
    data.then(text => {
        const textContainer = document.getElementById('text-container');
        removeClass(textContainer, 'display-none');
        textContainer.innerText = text.text;
        socket.emit('INIT_GAME', roomId);
    })
}

function showTimer(timerElementId, seconds, onComplete) {
    const timer = document.getElementById(timerElementId);
    timer.textContent = seconds;
    removeClass(timer, 'display-none')
    const countdown = setInterval(() => {
        seconds--;
        timer.textContent = seconds;
        if (seconds <= 0) {
            clearInterval(countdown);
            onComplete();
            addClass(timer, 'display-none')
        }
    }, 1000);
}

function startTimer(secondsBeforeStart, {id}, textId) {
    addClass(document.getElementById('ready-btn'), 'display-none');
    addClass(document.getElementById('quit-room-btn'), 'display-none');
    const text = fetchData(`http://localhost:3001/game/texts/${textId}`)
    showTimer('timer', secondsBeforeStart, () => startGameProgress(id, text))
}

socket.on('START_TIMER', startTimer);

function updateProgress(textToType, typedText) {
    const progress = Math.round(typedText.length * 100 / textToType.length);
    socket.emit('UPDATE_PROGRESS', progress)
}

let textToType;
let typedText = '';

function handleKeyDown(event) {

    if (event.key.length === 1) {
        let typedTextTest = typedText + event.key;
        if (!textToType.startsWith(typedTextTest)) {
            return;
        }
        typedText = typedTextTest;

        updateProgress(textToType, typedText);

        const textContainer = document.getElementById('text-container');
        textContainer.innerHTML = '';

        let correctlyTypedTextSpan = document.getElementById('correct');
        if (!correctlyTypedTextSpan) {
            correctlyTypedTextSpan = document.createElement('span');
            correctlyTypedTextSpan.id = 'correct';
        }
        correctlyTypedTextSpan.innerText = typedText;
        textContainer.append(correctlyTypedTextSpan);

        let nextLetterSpan = document.getElementById('next');
        if (!nextLetterSpan) {
            nextLetterSpan = document.createElement('span');
            nextLetterSpan.id = 'next';
        }
        const indexOfLastTypeCharacter = typedText.length;
        nextLetterSpan.innerText = textToType.charAt(indexOfLastTypeCharacter);
        textContainer.append(nextLetterSpan);

        let remainingTextSpan = document.getElementById('remaining');
        if (!remainingTextSpan) {
            remainingTextSpan = document.createElement('span');
        }
        remainingTextSpan.innerText = textToType.substring(indexOfLastTypeCharacter + 1);
        textContainer.append(remainingTextSpan);
    }
}

function startGame(secondsForGame) {
    showTimer('game-timer', 15, () => socket.emit('GAME_TIMEOUT'))
    textToType = document.getElementById('text-container').textContent;
    document.addEventListener('keydown', handleKeyDown);
}

socket.on('START_GAME', startGame)


function finishGame(room) {
    showResultsModal({
        usersSortedArray: room.users
            .sort((user1, user2) => {
                return user1.progress - user2.progress
            })
            .map(user => user.username),
        onClose: () => {
        }
    });
    removeClass(document.getElementById('ready-btn'), 'display-none')
    document.getElementById('ready-btn').innerText = 'READY'
    removeClass(document.getElementById('quit-room-btn'), 'display-none')
    addClass(document.getElementById('text-container'), 'display-none')
    document.removeEventListener('keydown', handleKeyDown);
    textToType = '';
    typedText = '';
}

socket.on('FINISH_GAME', finishGame)