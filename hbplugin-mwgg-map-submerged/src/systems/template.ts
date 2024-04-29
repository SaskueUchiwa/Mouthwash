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

export interface SystemNameSystemData {

}

export type SystemNameSystemEvents<RoomType extends Hostable = Hostable> = SystemStatusEvents<RoomType> &
    ExtractEventTypes<[]>;

/**
 * Represents a system responsible for handling communication sabotages on The Skeld and Polus.
 *
 * See {@link SystemNameSystemEvents} for events to listen to.
 */
export class SystemNameSystem<RoomType extends Hostable = Hostable> extends SystemStatus<
    SystemNameSystemData,
    SystemNameSystemEvents,
    RoomType
> implements SystemNameSystemData {
    constructor(
        ship: InnerShipStatus<RoomType>,
        systemType: SystemType,
        data?: HazelReader | SystemNameSystemData
    ) {
        super(ship, systemType, data);
    }

    get sabotaged() {
        return false;
    }

    patch(data: SystemNameSystemData) {

    }

    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    Deserialize(reader: HazelReader, spawn: boolean) {

    }

    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    Serialize(writer: HazelWriter, spawn: boolean) {

    }

    async HandleSabotage(player: PlayerData|undefined, rpc: RepairSystemMessage|undefined) {

    }

    private async _repair(player: PlayerData|undefined, rpc: RepairSystemMessage|undefined) {

    }

    async repair() {
        if (this.room.hostIsMe) {
            await this._repair(this.room.myPlayer, undefined);
        } else {
            await this._sendRepair(0);
        }
    }

    async HandleRepair(player: PlayerData<RoomType>|undefined, amount: number, rpc: RepairSystemMessage|undefined) {
        switch (amount) {

        }
    }

    Detoriorate(delta: number) {

    }
}
