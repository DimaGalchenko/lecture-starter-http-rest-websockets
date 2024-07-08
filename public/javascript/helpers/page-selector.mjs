import {addClass, removeClass} from "./dom-helper.mjs";

export function showRoomsPage() {
    removeClass(document.getElementById('rooms-page'), 'display-none')
    addClass(document.getElementById('game-page'), 'display-none')
}

export function showGamePage() {
    removeClass(document.getElementById('game-page'), 'display-none')
    addClass(document.getElementById('rooms-page'), 'display-none')
}