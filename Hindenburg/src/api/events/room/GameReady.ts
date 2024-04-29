import { BasicEvent } from "@skeldjs/events";
import { Room } from "../../../worker";

export class RoomGameReadyEvent extends BasicEvent {
    static eventName = "room.gameready" as const;
    eventName = "room.gameready" as const;

    constructor(
        public readonly room: Room
    ) {
        super();
    }
}