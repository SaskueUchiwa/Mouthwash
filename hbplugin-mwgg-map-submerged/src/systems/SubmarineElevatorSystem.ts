import { HazelReader, HazelWriter } from "@skeldjs/util";
import { PlayerDataFlags, SystemType } from "@skeldjs/constant";
import { RepairSystemMessage } from "@skeldjs/protocol";
import { ExtractEventTypes } from "@skeldjs/events";

import {
    InnerShipStatus,
    SystemStatus,
    SystemStatusEvents,
    PlayerData,
    Hostable,
    Door
} from "@skeldjs/core";

import { ElevatorBounds } from "../data";
import { SubmergedSystemType } from "../enums";
import { PlayerFloor, SubmarinePlayerFloorSystem } from "./SubmarinePlayerFloorSystem";

export enum ElevatorMovementStage {
    DoorsClosing,
    FadingToBlack,
    ElevatorMovingOut,
    Wait,
    ElevatorMovingIn,
    FadingToClear,
    DoorsOpening,
    Complete
}

export interface SubmarineElevatorSystemData {
    targetFloor: PlayerFloor;
    moving: boolean;
    tandemElevator: SubmergedSystemType;
}

export type SubmarineElevatorSystemEvents<RoomType extends Hostable = Hostable> = SystemStatusEvents<RoomType> &
    ExtractEventTypes<[]>;

/**
 * See {@link SubmarineElevatorSystemEvents} for events to listen to.
 */
export class SubmarineElevatorSystem<RoomType extends Hostable = Hostable> extends SystemStatus<
    SubmarineElevatorSystemData,
    SubmarineElevatorSystemEvents,
    RoomType
> implements SubmarineElevatorSystemData {
    static stageTimings = [
        0.4,
        0.5,
        1.25,
        0.25,
        1.25,
        0.5,
        0.2
    ];

    targetFloor: PlayerFloor;
    moving: boolean;
    tandemElevator: SubmergedSystemType;

    upperDoorInner: Door|null;
    upperDoorOuter: Door|null;
    lowerDoorInner: Door|null;
    lowerDoorOuter: Door|null;

    lastStage: ElevatorMovementStage;
    totalTimer: number;

    constructor(
        ship: InnerShipStatus<RoomType>,
        systemType: SystemType,
        data?: HazelReader | SubmarineElevatorSystemData
    ) {
        super(ship, systemType, data);

        this.targetFloor ??= PlayerFloor.LowerDeck;
        this.moving ??= false;
        this.tandemElevator ??= SubmergedSystemType.Nil;

        this.lastStage ??= ElevatorMovementStage.Complete;
        this.totalTimer ??= 0;

        this.upperDoorInner ??= null;
        this.upperDoorOuter ??= null;
        this.lowerDoorInner ??= null;
        this.lowerDoorOuter ??= null;
    }

    get sabotaged() {
        return false;
    }

    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    Deserialize(reader: HazelReader, spawn: boolean) {
        this.targetFloor = reader.bool() ? PlayerFloor.UpperDeck : PlayerFloor.LowerDeck;
        this.moving = reader.bool();
        const lastStage = reader.uint8();
        if (this.lastStage !== lastStage) {
            this.lastStage = lastStage;
        }
    }

    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    Serialize(writer: HazelWriter, spawn: boolean) {
        writer.bool(this.targetFloor === PlayerFloor.UpperDeck);
        writer.bool(this.moving);
        writer.uint8(this.lastStage);
    }

    async HandleRepair(player: PlayerData<RoomType>|undefined, amount: number, rpc: RepairSystemMessage|undefined) {
        switch (amount) {
        case 2:
            if (!this.moving) {
                this.moving = true;
                this.totalTimer = 0;
                this.lastStage = ElevatorMovementStage.Complete;
                this.targetFloor = this.targetFloor === PlayerFloor.LowerDeck ? PlayerFloor.UpperDeck : PlayerFloor.LowerDeck;
                this.dirty = true;
            }

            if (this.tandemElevator !== SubmergedSystemType.Nil) {
                const otherElevator = this.ship.systems.get(this.tandemElevator as number);
                if (otherElevator instanceof SubmarineElevatorSystem) {
                    otherElevator.moving = true;
                    otherElevator.totalTimer = this.totalTimer;
                    otherElevator.lastStage = this.lastStage;
                    otherElevator.targetFloor = this.moving
                        ? (this.targetFloor === PlayerFloor.LowerDeck ? PlayerFloor.UpperDeck : PlayerFloor.LowerDeck)
                        : this.targetFloor;
                    otherElevator.dirty = true;
                }
            }
            break;
        }
    }

    private getNextStage(): ElevatorMovementStage {
        let sum = 0;
        for (let i = 0; i < SubmarineElevatorSystem.stageTimings.length; i++) {
            sum += SubmarineElevatorSystem.stageTimings[i];
            if (this.totalTimer <= sum) {
                return i;
            }
        }

        return ElevatorMovementStage.DoorsOpening;
    }

    getPlayersInside() {
        const players = [];
        const bounds = ElevatorBounds[this.systemType as number as SubmergedSystemType];

        if (!bounds)
            throw new Error("No elevator bounds; systemType is " + this.systemType);

        for (const [ , player ] of this.room.players) {
            const position = player.transform?.position;
            if (!position)
                continue;

            if (this.targetFloor === PlayerFloor.UpperDeck) { // means it's coming from the lower elevator, so players will be there
                if (bounds.lower.contains(position))
                    players.push(player);
            } else {
                if (bounds.upper.contains(position))
                    players.push(player);
            }
        }

        return players;
    }

    updateDoors() {
        this.upperDoorInner?.setOpen(this.targetFloor === PlayerFloor.UpperDeck);
        this.upperDoorOuter?.setOpen(this.targetFloor === PlayerFloor.UpperDeck);
        this.lowerDoorInner?.setOpen(this.targetFloor === PlayerFloor.LowerDeck);
        this.lowerDoorOuter?.setOpen(this.targetFloor === PlayerFloor.LowerDeck);
    }

    Detoriorate(delta: number) {
        if (!this.moving) {
            this.totalTimer = 0;
            this.lastStage = ElevatorMovementStage.Complete;
            this.updateDoors();
            return;
        }
        this.upperDoorInner?.setOpen(false);
        this.upperDoorOuter?.setOpen(false);
        this.lowerDoorInner?.setOpen(false);
        this.lowerDoorOuter?.setOpen(false);
        this.totalTimer += delta;
        if (this.room.hostIsMe) {
            if (this.lastStage === ElevatorMovementStage.DoorsOpening) {
                this.moving = false;
                return;
            }
            const nextStage = this.getNextStage();
            if (this.lastStage !== nextStage) {
                if (nextStage > ElevatorMovementStage.ElevatorMovingIn) {
                    const playersInside = this.getPlayersInside();
                    for (const player of playersInside) {
                        const floorSystem = this.ship.systems.get(SubmergedSystemType.Floor as number);
                        if (floorSystem instanceof SubmarinePlayerFloorSystem) {
                            floorSystem.setPlayerFloor(player, this.targetFloor as PlayerFloor);
                        }
                    }
                }
                this.dirty = true;
            }
            this.lastStage = nextStage;
        }
    }
}
