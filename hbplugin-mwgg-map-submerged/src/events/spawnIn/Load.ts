import { Hostable } from "@skeldjs/core";
import { CancelableEvent } from "@skeldjs/events";
import { SubmarineSpawnInSystem } from "../../systems";

export class SubmergedSpawnInLoadEvent<RoomType extends Hostable = Hostable> extends CancelableEvent {
    static eventName = "mwgg.submerged.spawnIn.load" as const;
    eventName = "mwgg.submerged.spawnIn.load" as const;

    constructor(
        public readonly room: RoomType,
        public readonly spawnInSystem: SubmarineSpawnInSystem
    ) {
        super();
    }
}