import {
    BaseRpcMessage,
    DeconSystem,
    Door,
    DoorsSystem,
    HazelReader,
    Hostable,
    HudOverrideSystem,
    MedScanSystem,
    ReactorSystem,
    SabotageSystem,
    SecurityCameraSystem,
    ShipStatusData,
    SkeldShipStatus,
    SpawnType,
    SwitchSystem,
    SystemType
} from "@skeldjs/hindenburg";

import { SubmergedRpcMessageTag, SubmergedSystemType } from "../enums";
import {
    PlayerFloor,
    SpawnInState,
    SubmarineBoxCatSystem,
    SubmarineElevatorSystem,
    SubmarineOxygenSystem,
    SubmarinePlayerFloorSystem,
    SubmarineSecuritySabotageSystem,
    SubmarineSpawnInSystem
} from "../systems";

export class SubmergedShipStatus<RoomType extends Hostable<any>> extends SkeldShipStatus<RoomType> {
    static roomDoors: Partial<Record<SystemType, number[]>> = {
        [SubmergedSystemType.UpperLobby as number]: [0, 1],
        [SystemType.Communications]: [2],
        [SubmergedSystemType.Research as number]: [3],
        [SystemType.Medical]: [4],
        [SystemType.MeetingRoom]: [5, 6],
        [SystemType.Administrator]: [7],
        [SubmergedSystemType.Observatory as number]: [8],
        [SystemType.Security]: [9],
        [SystemType.Engine]: [10],
        [SystemType.Storage]: [11, 12],
        [SystemType.Electrical]: [13, 14],
        [SystemType.Decontamination]: [15, 16],
        [SystemType.Decontamination2]: [17, 18],
        [SystemType.Hallway]: [19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34,
            35, 36, 37, 38]
    };

    constructor(
        room: RoomType,
        spawnType: SpawnType,
        netId: number,
        ownerid: number,
        flags: number,
        data?: HazelReader | ShipStatusData
    ) {
        super(room, spawnType, netId, ownerid, flags, data);
    }

    Setup() {
        this.systems.set(SystemType.Communications, new HudOverrideSystem(this, SystemType.Communications, {
            sabotaged: false,
        }));

        this.systems.set(SystemType.Doors, new DoorsSystem(this, SystemType.Doors, {
            doors: [], // TODO
            cooldowns: new Map // TODO
        }));

        this.systems.set(SystemType.Electrical, new SwitchSystem(this, SystemType.Electrical, {
            actual: [ false, false, false, false, false ],
            expected: [ false, false, false, false, false ],
            brightness: 255
        }));

        this.systems.set(SystemType.MedBay, new MedScanSystem(this, SystemType.MedBay, {
            queue: []
        }));

        this.systems.set(SystemType.Reactor, new ReactorSystem(this, SystemType.Reactor, {
            timer: 10000,
            completed: new Set,
        }));

        this.systems.set(SystemType.Security, new SecurityCameraSystem(this, SystemType.Security, {
            players: new Set
        }));

        // this.systems.set(SystemType.Ventilation, ) TODO: Ventilation system

        this.systems.set(SubmergedSystemType.UpperCentral as number, new SubmarineOxygenSystem(this, SubmergedSystemType.UpperCentral as number, {
            countdown: 10000,
            playersWithMask: new Set,
            doKillCheck: false
        }));

        this.systems.set(SubmergedSystemType.ElevatorHallwayLeft as number, new SubmarineElevatorSystem(this, SubmergedSystemType.ElevatorHallwayLeft as number, {
            targetFloor: PlayerFloor.LowerDeck,
            moving: false,
            tandemElevator: SubmergedSystemType.ElevatorHallwayRight
        }));

        this.systems.set(SubmergedSystemType.ElevatorHallwayRight as number, new SubmarineElevatorSystem(this, SubmergedSystemType.ElevatorHallwayRight as number, {
            targetFloor: PlayerFloor.UpperDeck,
            moving: false,
            tandemElevator: SubmergedSystemType.ElevatorHallwayLeft
        }));

        this.systems.set(SubmergedSystemType.ElevatorLobbyLeft as number, new SubmarineElevatorSystem(this, SubmergedSystemType.ElevatorLobbyLeft as number, {
            targetFloor: PlayerFloor.UpperDeck,
            moving: false,
            tandemElevator: SubmergedSystemType.ElevatorLobbyRight
        }));

        this.systems.set(SubmergedSystemType.ElevatorLobbyRight as number, new SubmarineElevatorSystem(this, SubmergedSystemType.ElevatorLobbyRight as number, {
            targetFloor: PlayerFloor.LowerDeck,
            moving: false,
            tandemElevator: SubmergedSystemType.ElevatorLobbyLeft
        }));

        this.systems.set(SubmergedSystemType.ElevatorService as number, new SubmarineElevatorSystem(this, SubmergedSystemType.ElevatorService as number, {
            targetFloor: PlayerFloor.LowerDeck,
            moving: false,
            tandemElevator: SubmergedSystemType.Nil
        }));

        this.systems.set(SubmergedSystemType.Floor as number, new SubmarinePlayerFloorSystem(this, SubmergedSystemType.Floor as number, {
            playerFloors: new Map
        }));

        this.systems.set(SubmergedSystemType.SecuritySabotage as number, new SubmarineSecuritySabotageSystem(this, SubmergedSystemType.SecuritySabotage as number, {
            fixedCameras: [ 0, 1, 2, 3, 4, 5, 6 ]
        }));

        this.systems.set(SubmergedSystemType.SpawnIn as number, new SubmarineSpawnInSystem(this, SubmergedSystemType.SpawnIn as number, {
            players: new Set,
            currentState: SpawnInState.Spawning,
            timer: 10
        }));

        this.systems.set(SubmergedSystemType.BoxCat as number, new SubmarineBoxCatSystem(this, SubmergedSystemType.BoxCat as number, {
            position: 255
        }));

        this.systems.set(SystemType.Sabotage, new SabotageSystem(this, SystemType.Sabotage, {
            cooldown: 0
        }));

        this.systems.set(SystemType.Decontamination, new DeconSystem(this, SystemType.Decontamination, {
            timer: 0,
            state: 0,
        }));

        this.systems.set(SystemType.Decontamination2, new DeconSystem(this, SystemType.Decontamination2, {
            timer: 0,
            state: 0,
        }));
        
        const doorSystem = this.systems.get(SystemType.Doors)! as DoorsSystem;
        doorSystem.doors = [];
        let doorId = 0
        for (; doorId < 15; doorId++) {
            doorSystem.doors.push(new Door(doorSystem, doorId, true));
        }

        doorSystem.doors.push(new Door(doorSystem, doorId++, false)); // decon 1
        doorSystem.doors.push(new Door(doorSystem, doorId++, false)); // decon 1
        doorSystem.doors.push(new Door(doorSystem, doorId++, false)); // decon 2
        doorSystem.doors.push(new Door(doorSystem, doorId++, false)); // decon 2

        const elevators = [
            this.systems.get(SubmergedSystemType.ElevatorHallwayLeft as number) as SubmarineElevatorSystem,
            this.systems.get(SubmergedSystemType.ElevatorHallwayRight as number) as SubmarineElevatorSystem,
            this.systems.get(SubmergedSystemType.ElevatorLobbyLeft as number) as SubmarineElevatorSystem,
            this.systems.get(SubmergedSystemType.ElevatorLobbyRight as number) as SubmarineElevatorSystem,
            this.systems.get(SubmergedSystemType.ElevatorService as number) as SubmarineElevatorSystem
        ];
        for (const elevator of elevators) {
            const outerLower = new Door(doorSystem, doorId++, elevator.targetFloor === PlayerFloor.LowerDeck);
            const innerLower = new Door(doorSystem, doorId++, elevator.targetFloor === PlayerFloor.LowerDeck);
            const outerUpper = new Door(doorSystem, doorId++, elevator.targetFloor === PlayerFloor.UpperDeck);
            const innerUpper = new Door(doorSystem, doorId++, elevator.targetFloor === PlayerFloor.UpperDeck);

            elevator.lowerDoorOuter = outerLower;
            elevator.lowerDoorInner = innerLower;
            elevator.upperDoorOuter = outerUpper;
            elevator.upperDoorInner = innerUpper;

            doorSystem.doors.push(outerLower, innerLower, outerUpper, innerUpper);
        }

        const boxCatSystem = this.systems.get(SubmergedSystemType.BoxCat as number) as SubmarineBoxCatSystem;
        boxCatSystem.moveCat();
    }
    
    async HandleRpc(rpc: BaseRpcMessage): Promise<void> {
        await super.HandleRpc(rpc);

        switch (rpc.messageTag) {
            case SubmergedRpcMessageTag.AcknowledgeChangeFloor:
                break;
        }
    }

    getDoorsInRoom(room: SystemType) {
        return SubmergedShipStatus.roomDoors[room] || [];
    }
}