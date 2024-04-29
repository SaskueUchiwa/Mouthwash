import {
    BaseRpcMessage,
    HazelReader,
    Hostable,
    PlayerPhysics,
    PlayerPhysicsData,
    RpcMessage,
    SpawnType
} from "@skeldjs/hindenburg";

import { SubmergedRpcMessageTag, SubmergedSystemType } from "../enums";
import { SubmarinePlayerFloorSystem } from "../systems";

import { AcknowledgeChangeFloorMessage, RequestChangeFloorMessage } from "../packets";

export class SubmergedPlayerPhysics<RoomType extends Hostable<any>> extends PlayerPhysics<RoomType> {
    constructor(
        room: RoomType,
        spawnType: SpawnType,
        netId: number,
        ownerid: number,
        flags: number,
        data?: HazelReader | PlayerPhysicsData
    ) {
        super(room, spawnType, netId, ownerid, flags, data);
    }

    async HandleRpc(rpc: BaseRpcMessage): Promise<void> {
        switch (rpc.messageTag) {
            case SubmergedRpcMessageTag.AcknowledgeChangeFloor:
                break;
            case SubmergedRpcMessageTag.RequestChangeFloor:
                await this._handleRequestChangeFloor(rpc as RequestChangeFloorMessage);
                break;
        }
    }

    protected async _handleRequestChangeFloor(requestChangeFloorMessage: RequestChangeFloorMessage) {
        if (!this.room.hostIsMe)
            return;

        const floorSystem = this.room.shipStatus?.systems.get(SubmergedSystemType.Floor as number);
        if (floorSystem instanceof SubmarinePlayerFloorSystem) {
            // we don't need to handle sequence IDs since we have ordered messages
            // however, that means that this is technically an incomplete implementation
            // TODO: above

            floorSystem.setPlayerFloor(this.player, requestChangeFloorMessage.targetFloor);
            floorSystem.respondToFloorChange(this.player, requestChangeFloorMessage.sequenceId);
        }
    }
}