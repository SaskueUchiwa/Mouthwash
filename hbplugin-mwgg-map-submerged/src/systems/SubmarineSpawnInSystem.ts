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
import { SubmergedSpawnInDoneEvent, SubmergedSpawnInLoadEvent } from "../events";

export interface SubmarineSpawnInSystemData {
    players: Set<PlayerData>;
    currentState: SpawnInState;
    timer: number;
}

export enum SpawnInState {
    Loading,
    Spawning,
    Done
}

export type SubmarineSpawnInSystemEvents<RoomType extends Hostable = Hostable> = SystemStatusEvents<RoomType> &
    ExtractEventTypes<[ SubmergedSpawnInDoneEvent, SubmergedSpawnInLoadEvent ]>;

/**
 * See {@link SubmarineSpawnInSystemEvents} for events to listen to.
 */
export class SubmarineSpawnInSystem<RoomType extends Hostable = Hostable> extends SystemStatus<
    SubmarineSpawnInSystemData,
    SubmarineSpawnInSystemEvents,
    RoomType
> implements SubmarineSpawnInSystemData {
    players: Set<PlayerData<RoomType>>;
    currentState: SpawnInState;
    timer: number;
    
    private timerUpdateDelay: number;

    constructor(
        ship: InnerShipStatus<RoomType>,
        systemType: SystemType,
        data?: HazelReader | SubmarineSpawnInSystemData
    ) {
        super(ship, systemType, data);

        this.players ||= new Set;
        this.currentState ||= SpawnInState.Loading;
        this.timer ||= 10;
        this.timerUpdateDelay = 0.5;
    }

    get sabotaged() {
        return false;
    }

    patch(data: SubmarineSpawnInSystemData) {

    }

    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    Deserialize(reader: HazelReader, spawn: boolean) {
        this.currentState = reader.uint8();
        const numPlayers = reader.upacked();
        this.players.clear();
        for (let i = 0; i < numPlayers; i++) {
            const playerId = reader.uint8();
            const player = this.room.getPlayerByPlayerId(playerId);
            if (player) this.players.add(player);
        }
        this.timer = reader.float();
    }

    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    Serialize(writer: HazelWriter, spawn: boolean) {
        writer.uint8(this.currentState);
        writer.upacked(this.players.size);
        for (const player of this.players) writer.uint8(player.playerId!);
        writer.float(this.timer);
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
        if (player !== undefined) {
            this.players.add(player);
            this.dirty = true;
        }
    }

    resetSpawns() {
        this.currentState = SpawnInState.Loading;
        this.players.clear();
        this.timer = 10;
        this.dirty = true;
    }

    async Detoriorate(delta: number) {
        if (this.currentState === SpawnInState.Spawning) {
            this.timer -= delta;
            this.timerUpdateDelay -= delta;
            if (this.timer < 0) this.timer = 0;
            if (this.timerUpdateDelay < 0) {
                this.dirty = true;
                this.timerUpdateDelay = 0.5;
            }
        }
        if (this.room.gameData) {
            for (const [ , player ] of this.room.players) {
                if (player.playerInfo && !player.playerInfo.isDead && !player.playerInfo.isDisconnected && !this.players.has(player))
                    return; // set spawn in state to done once all players have spawned in
            }
        }
        this.players.clear();
        this.timer = 10;
        if (this.currentState === SpawnInState.Spawning) {
            const ev = await this.emit(new SubmergedSpawnInDoneEvent(this.room, this));
            if (!ev.canceled) this.currentState = SpawnInState.Done;
        } else if (this.currentState === SpawnInState.Loading) {
            const ev = await this.emit(new SubmergedSpawnInLoadEvent(this.room, this));
            if (!ev.canceled) this.currentState = SpawnInState.Spawning;
        }
        this.dirty = true;
    }
}
