import { Hostable } from "@skeldjs/core";
import { CancelableEvent } from "@skeldjs/events";
import { SubmarineSpawnInSystem } from "../../systems";

export class SubmergedSpawnInDoneEvent<RoomType extends Hostable = Hostable> extends CancelableEvent {
    static eventName = "mwgg.submerged.spawnIn.done" as const;
    eventName = "mwgg.submerged.spawnIn.done" as const;

    constructor(
        public readonly room: RoomType,
        public readonly spawnInSystem: SubmarineSpawnInSystem
    ) {
        super();
    }
}