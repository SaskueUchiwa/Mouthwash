import {
    BaseRpcMessage,
    HazelReader,
    HazelWriter,
    Networkable,
    NetworkableEvents,
    PlayerData,
    Room,
    RpcMessage,
    SpawnType
} from "@skeldjs/hindenburg";

import { ExtractEventTypes } from "@skeldjs/events";

import { BodyDirection, MouthwashRpcMessageTag } from "../enums";
import { Palette, RGBA } from "../misc";
import { ReportDeadBodyMessage } from "../packets";
import { DeadBodyReportEvent } from "./events";

export interface DeadBodyData {
    color: RGBA;
    shadowColor: RGBA;
    playerId: number;
    hasFallen: boolean;
    bodyFacing: BodyDirection;
}

export type DeadBodyEvents = NetworkableEvents & ExtractEventTypes<[
    DeadBodyReportEvent
]>;

export class DeadBody extends Networkable<DeadBodyData, DeadBodyEvents, Room> implements DeadBodyData {
    color: RGBA;
    shadowColor: RGBA;
    playerId: number;
    hasFallen: boolean;
    bodyFacing: BodyDirection;

    constructor(
        room: Room,
        spawnType: SpawnType,
        netId: number,
        ownerId: number,
        flags: number,
        data?: HazelReader | DeadBodyData
    ) {
        super(room, spawnType, netId, ownerId, flags, data);

        this.color ||= Palette.forteGreenLight;
        this.shadowColor ||= Palette.forteGreenShadow;
        this.playerId ??= 0xff;
        this.hasFallen ||= false;
        this.bodyFacing ||= BodyDirection.Left;
    }

    async HandleRpc(rpc: BaseRpcMessage): Promise<void> {
        if (rpc.messageTag === MouthwashRpcMessageTag.ReportDeadBody) {
            await this._handleReport(rpc as ReportDeadBodyMessage);
        }
    }
    
    Deserialize(reader: HazelReader) {
        this.hasFallen = reader.bool();
        this.bodyFacing = reader.uint8();
        this.playerId = reader.uint8();
        this.shadowColor = reader.read(RGBA);
        this.color = reader.read(RGBA);
    }

    Serialize(writer: HazelWriter) {
        writer.bool(this.hasFallen);
        writer.uint8(this.bodyFacing);
        writer.uint8(this.playerId);
        writer.write(this.shadowColor);
        writer.write(this.color);
        this.dirtyBit = 0;
        this.hasFallen = true;
        return true;
    }

    setBodyFacing(direction: BodyDirection) {
        this.bodyFacing = direction;
        this.dirtyBit = 1;
    }

    setColor(color: RGBA) {
        this.color = color;
        this.dirtyBit = 1;
    }

    setShadowColor(color: RGBA) {
        this.shadowColor = color;
        this.dirtyBit = 1;
    }
    
    protected async _handleReport(rpc: ReportDeadBodyMessage) {
        const player = this.room.getPlayerByNetId(rpc.reporterNetId);
        if (player === undefined) return;
        const ev = await this.emit(new DeadBodyReportEvent(this.room, this, rpc, player));
        if (!ev.canceled) {
            this._report();
        }
    }

    protected _report() {
        this.despawn();
    }

    protected _rpcReport(reporterPlayer: PlayerData<Room>) {
        this.room.messageStream.push(new RpcMessage(this.netId, new ReportDeadBodyMessage(reporterPlayer.control!.netId)));
    }

    async report(reporterPlayer: PlayerData<Room>) {
        if (!reporterPlayer.control) throw new Error("Player has no PlayerControl object to report from");
        const ev = await this.emit(new DeadBodyReportEvent(this.room, this, undefined, reporterPlayer));
        if (!ev.canceled) {
            this.despawn();
            this._rpcReport(reporterPlayer);
        }
    }
}