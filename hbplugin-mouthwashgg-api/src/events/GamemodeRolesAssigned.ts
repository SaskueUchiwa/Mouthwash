import { BasicEvent } from "@skeldjs/events";
import { Room } from "@skeldjs/hindenburg";

export class GamemodeRolesAssignedEvent extends BasicEvent {
    static eventName = "mwgg.gamemode.rolesassigned" as const;
    eventName = "mwgg.gamemode.rolesassigned" as const;

    constructor(public readonly room: Room) {
        super();
    }
}