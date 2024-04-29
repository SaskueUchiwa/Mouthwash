import { BasicEvent } from "@skeldjs/events";
import { PlayerData, Room } from "@skeldjs/hindenburg";
import { EndGameScreen } from "../api";

export class GamemodeGameEndEvent extends BasicEvent {
    static eventName = "mwgg.gamemode.gameend" as const;
    eventName = "mwgg.gamemode.gameend" as const;

    constructor(
        public readonly room: Room,
        public readonly endGameScreens: Map<PlayerData<Room>, EndGameScreen>
    ) {
        super();
    }
}