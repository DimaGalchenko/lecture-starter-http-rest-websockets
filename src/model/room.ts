
type User = {
    username: string,
    ready: boolean,
    progress?: number
}

export interface Room {
    id: string,
    name: string,
    numberOfUsers: number,
    users: User[],
    gameInProgress: boolean
}