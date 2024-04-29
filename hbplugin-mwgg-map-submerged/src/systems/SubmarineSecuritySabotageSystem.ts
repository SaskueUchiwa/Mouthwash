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

export interface SubmarineSecuritySabotageSystemData {
    fixedCameras: number[];
}

export type SubmarineSecuritySabotageSystemEvents<RoomType extends Hostable = Hostable> = SystemStatusEvents<RoomType> &
    ExtractEventTypes<[]>;

/**
 * See {@link SubmarineSecuritySabotageSystemEvents} for events to listen to.
 */
export class SubmarineSecuritySabotageSystem<RoomType extends Hostable = Hostable> extends SystemStatus<
    SubmarineSecuritySabotageSystemData,
    SubmarineSecuritySabotageSystemEvents,
    RoomType
> implements SubmarineSecuritySabotageSystemData {
    fixedCameras: number[];

    constructor(
        ship: InnerShipStatus<RoomType>,
        systemType: SystemType,
        data?: HazelReader | SubmarineSecuritySabotageSystemData
    ) {
        super(ship, systemType, data);

        this.fixedCameras ||= [];
    }

    get sabotaged() {
        return false;
    }

    patch(data: SubmarineSecuritySabotageSystemData) {

    }

    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    Deserialize(reader: HazelReader, spawn: boolean) {
        const numFixedCameras = reader.upacked();
        this.fixedCameras = [];
        for (let i = 0; i < numFixedCameras; i++) {
            this.fixedCameras.push(reader.uint8());
        }
    }

    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    Serialize(writer: HazelWriter, spawn: boolean) {
        writer.upacked(this.fixedCameras.length);
        for (const fixedCamera of this.fixedCameras) {
            writer.uint8(fixedCamera);
        }
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
