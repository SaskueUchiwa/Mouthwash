import { HazelReader, HazelWriter } from "@skeldjs/util";
import { SystemType } from "@skeldjs/constant";
import { RepairSystemMessage } from "@skeldjs/protocol";
import { ExtractEventTypes } from "@skeldjs/events";

import {
    InnerShipStatus,
    SystemStatus,
    SystemStatusEvents,
    PlayerData,
    Hostable
} from "@skeldjs/core";

export interface SubmarineBoxCatSystemData {
    position: number;
}

export type SubmarineBoxCatSystemEvents<RoomType extends Hostable = Hostable> = SystemStatusEvents<RoomType> &
    ExtractEventTypes<[]>;

/**
 * See {@link SubmarineBoxCatSystemEvents} for events to listen to.
 */
export class SubmarineBoxCatSystem<RoomType extends Hostable = Hostable> extends SystemStatus<
    SubmarineBoxCatSystemData,
    SubmarineBoxCatSystemEvents,
    RoomType
> implements SubmarineBoxCatSystemData {
    position: number;

    constructor(
        ship: InnerShipStatus<RoomType>,
        systemType: SystemType,
        data?: HazelReader | SubmarineBoxCatSystemData
    ) {
        super(ship, systemType, data);

        this.position ??= 255;
    }

    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    Deserialize(reader: HazelReader, spawn: boolean) {
        this.position = reader.uint8();
    }

    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    Serialize(writer: HazelWriter, spawn: boolean) {
        writer.uint8(this.position);
    }

    moveCat() {
        if (this.position === 255) {
            this.position = Math.floor(Math.random() * 2);
        } else {
            this.position = (this.position + 1) % 2;
        }
        this.dirty = true;
    }
}
