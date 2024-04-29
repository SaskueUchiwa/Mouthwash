import {
    AirshipStatus,
    EndGameIntent,
    EventListener,
    GameMap,
    GameOverReason,
    GameState,
    HindenburgPlugin,
    PlayerCompleteTaskEvent,
    PlayerData,
    PlayerLeaveEvent,
    PreventLoad,
    Room,
    RoomEndGameIntentEvent,
    RpcMessage,
    Vector2
} from "@skeldjs/hindenburg";

import {
    AnyKillDistance,
    BaseGamemodePlugin,
    DeadBodySpawnEvent,
    DefaultRoomCategoryName,
    DefaultRoomOptionName,
    EndGameScreen,
    GamemodePlugin,
    GamemodeRolesAssignedEvent,
    MouthwashEndGames,
    RegisterRole,
    RoleAlignment,
} from "hbplugin-mouthwashgg-api";

import {
    BooleanValue,
    EnumValue,
    GameOption,
    HudItem,
    NumberValue,
    Palette,
    Priority,
    SetPlayerSpeedModifierMessage,
    SetPlayerVisionModifierMessage,
    WinSound
} from "mouthwash-types";

import { Infected, Uninfected, infectedColor, uninfectedColor } from "./roles";
import { PlayerFloor, SubmarinePlayerFloorSystem, SubmergedShipStatus, SubmergedSpawnInDoneEvent, SubmergedSpawnInLoadEvent, SubmergedSystemType } from "hbplugin-mwgg-map-submerged";

export type InfectionSpawnLocations = "Default"|"Reactor";

export const InfectionOptionName = {
    SpawnLocation: "Spawn Location",
    UninfectedCloseDoors: `${uninfectedColor.text("Crewmates")} Close Doors`,
    UninfectedSpeed: `${uninfectedColor.text("Crewmates")} Speed`,
    UninfectedVision: `${uninfectedColor.text("Crewmates")} Vision`,
    InitialInfectedCount: `Initial ${infectedColor.text("Infected")} Count`,
    InfectCooldown: "Infect Cooldown",
    InfectDistance: "Infect Distance",
    InfectedSpeed: `${infectedColor.text("Infected")} Speed`,
    InfectedVision: `${infectedColor.text("Infected")} Vision`,
    InfectedCloseDoors: `${infectedColor.text("Infected")} Close Doors`,
    TaskBar: "Task Bar"
} as const;

const infectedMapSpawnPositions: Record<GameMap, Vector2[]> = {
    [GameMap.TheSkeld]: [ new Vector2(-20.28, -5.29), new Vector2(-21.44, -3.96), new Vector2(-20.28, -6.62) ],
    [GameMap.AprilFoolsTheSkeld]: [ new Vector2(20.28, -5.29), new Vector2(21.44, -3.96), new Vector2(20.28, -6.62) ],
    [GameMap.Polus]: [ new Vector2(33.35, -6.12), new Vector2(36.31, -6.12), new Vector2(33.35, -7.92), new Vector2(36.31, -7.92) ],
    [GameMap.MiraHQ]: [ new Vector2(1.67, 11.33), new Vector2(2.59, 11.33), new Vector2(3.51, 11.33) ],
    [GameMap.Airship]: [ ]
}

const submergedUpperSpawnPositions = [ new Vector2(-1.73, 31.85), new Vector2(-0.96, 30.13), new Vector2(2.71, 30.13) ];
const submergedLowerSpawnPositions = [ new Vector2(-11, -39.1), new Vector2(-7.55, -42.63), new Vector2(-7.55, -42.63) ];

@PreventLoad
@GamemodePlugin({
    id: "infection",
    name: "Infection",
    version: "1.0.0",
    description: "There's been an outbreak on-board. Complete your tasks and don't get infected!",
    author: "weakeyes"
})
@RegisterRole(Infected)
@RegisterRole(Uninfected)
@HindenburgPlugin("hbplugin-mwgg-gamemode-infection", "1.0.0", "none")
export class InfectionGamemodePlugin extends BaseGamemodePlugin {
    getGameOptions() {
        const defaultOptions = this.api.createDefaultOptions();
        defaultOptions.delete(DefaultRoomOptionName.ImpostorVision);
        defaultOptions.delete(DefaultRoomOptionName.CrewmateVision);
        defaultOptions.delete(DefaultRoomOptionName.ImpostorKillDistance);
        defaultOptions.delete(DefaultRoomOptionName.PlayerSpeed);
        defaultOptions.delete(DefaultRoomOptionName.AnonymousVotes);
        defaultOptions.delete(DefaultRoomOptionName.ConfirmEjects);
        defaultOptions.delete(DefaultRoomOptionName.EmergencyCooldown);
        defaultOptions.delete(DefaultRoomOptionName.EmergencyMeetings);
        defaultOptions.delete(DefaultRoomOptionName.DiscussionTime);
        defaultOptions.delete(DefaultRoomOptionName.VotingTime);
        defaultOptions.delete(DefaultRoomOptionName.ImpostorKillCooldown);
        defaultOptions.delete(DefaultRoomOptionName.ImpostorCount);
        defaultOptions.delete(DefaultRoomOptionName.TaskBarUpdates);


        // defaultOptions.set(InfectionOptionName.SpawnLocation, new GameOption(DefaultRoomCategoryName.Config, InfectionOptionName.SpawnLocation, new EnumValue<InfectionSpawnLocations>([ "Default", "Reactor" ], 0), Priority.E));
        defaultOptions.set(InfectionOptionName.TaskBar, new GameOption(DefaultRoomCategoryName.Config, InfectionOptionName.TaskBar, new BooleanValue(false), Priority.E + 1));
        defaultOptions.set(InfectionOptionName.UninfectedSpeed, new GameOption(DefaultRoomCategoryName.CrewmateRoles, InfectionOptionName.UninfectedSpeed, new NumberValue(1.25, 0.25, 0.25, 3, false, "{0}x"), Priority.F));
        defaultOptions.set(InfectionOptionName.UninfectedVision, new GameOption(DefaultRoomCategoryName.CrewmateRoles, InfectionOptionName.UninfectedVision, new NumberValue(0.5, 0.25, 0.25, 2, false, "{0}x"), Priority.F + 1));
        defaultOptions.set(InfectionOptionName.UninfectedCloseDoors, new GameOption(DefaultRoomCategoryName.CrewmateRoles, InfectionOptionName.UninfectedCloseDoors, new BooleanValue(false), Priority.F + 2));
        defaultOptions.set(InfectionOptionName.InfectCooldown, new GameOption(DefaultRoomCategoryName.ImpostorRoles, InfectionOptionName.InfectCooldown, new NumberValue(10, 2.5, 0, 60, false, "{0}s"), Priority.G + 1));
        defaultOptions.set(InfectionOptionName.InfectDistance, new GameOption(DefaultRoomCategoryName.ImpostorRoles, InfectionOptionName.InfectDistance, new EnumValue<AnyKillDistance>(["Really Short", "Short", "Medium", "Long"], 1), Priority.G + 2));
        defaultOptions.set(InfectionOptionName.InfectedSpeed, new GameOption(DefaultRoomCategoryName.ImpostorRoles, InfectionOptionName.InfectedSpeed, new NumberValue(1.25, 0.25, 0.25, 3, false, "{0}x"), Priority.G + 3));
        defaultOptions.set(InfectionOptionName.InfectedVision, new GameOption(DefaultRoomCategoryName.ImpostorRoles, InfectionOptionName.InfectedVision, new NumberValue(0.75, 0.25, 0.25, 2, false, "{0}x"), Priority.G + 4));
        defaultOptions.set(InfectionOptionName.InfectedCloseDoors, new GameOption(DefaultRoomCategoryName.ImpostorRoles, InfectionOptionName.InfectedCloseDoors, new BooleanValue(false), Priority.G + 5));

        return defaultOptions;
    }

    getAdjustedImpostorCount(): number {
        return this.api.roleService.adjustImpostorCount(
            this.api.gameOptions.gameOptions.get(InfectionOptionName.InitialInfectedCount)?.getValue<NumberValue>().value ?? 2
        );
    }

    getRoleCounts() {
        const impostorCount = this.getAdjustedImpostorCount();
        return [
            {
                role: Infected,
                playerCount: impostorCount
            },
            {
                role: Uninfected,
                playerCount: this.room.players.size - impostorCount
            }
        ];
    }

    getInfectedAvailableSpawnPositions(player: PlayerData<Room>) {
        if (this.room.settings.map === 5 as number /* submerged */) {
            const floorSystem = this.room.shipStatus?.systems.get(SubmergedSystemType.Floor as number);
            if (floorSystem instanceof SubmarinePlayerFloorSystem) {
                const playerFloor = floorSystem.playerFloors.get(player);
                if (playerFloor === undefined) return;
                if (playerFloor === PlayerFloor.UpperDeck) {
                    return submergedUpperSpawnPositions;
                } else {
                    return submergedLowerSpawnPositions;
                }
            }
        } else {
            const infectedSpawnPositions = infectedMapSpawnPositions[this.room.settings.map];
            if (infectedSpawnPositions.length === 0) return undefined;
            return infectedSpawnPositions;
        }
    }

    getInfectedSpawnPosition(player: PlayerData<Room>, idx: number) {
        const spawnPositions = this.getInfectedAvailableSpawnPositions(player);
        if (spawnPositions === undefined) return undefined;
        return spawnPositions[idx % spawnPositions.length];
    }
    
    getSpawnPosition(nonInfectedCount: number, idx: number) {
        if (!this.room.shipStatus)
            return undefined;

        return Vector2.up
            .rotateDeg((idx - 1) * (360 / nonInfectedCount))
            .mul(this.room.shipStatus.spawnRadius)
            .add(this.room.shipStatus.initialSpawnCenter)
            .add(new Vector2(0, 0.3636));
    }

    @EventListener("mwgg.gamemode.rolesassigned")
    async onRolesAssigned(ev: GamemodeRolesAssignedEvent) {
        this.api.hudService.setHudItemVisibility(HudItem.CallMeetingButton, false);
        this.api.hudService.setHudItemVisibility(HudItem.ReportButton, false);
        this.api.hudService.setHudItemVisibility(HudItem.MapSabotageButtons, false);
        this.api.hudService.setHudItemVisibility(HudItem.VentButton, false);

        const taskBarVisible = this.api.gameOptions.gameOptions.get(InfectionOptionName.TaskBar)?.getValue<BooleanValue>().enabled || false;
        this.api.hudService.setHudItemVisibility(HudItem.TaskProgressBar, taskBarVisible);

        const infectedSpeed = this.api.gameOptions.gameOptions.get(InfectionOptionName.InfectedSpeed)?.getValue<NumberValue>().value || 1.25;
        const uninfectedSpeed = this.api.gameOptions.gameOptions.get(InfectionOptionName.UninfectedSpeed)?.getValue<NumberValue>().value || 1.25;
        
        const infectedVision = this.api.gameOptions.gameOptions.get(InfectionOptionName.InfectedVision)?.getValue<NumberValue>().value || .75;
        const uninfectedVision = this.api.gameOptions.gameOptions.get(InfectionOptionName.UninfectedVision)?.getValue<NumberValue>().value || .5;
        
        const playersUninfected: PlayerData<Room>[] = [];
        const playersInfected: PlayerData<Room>[] = [];
        for (const [ , player ] of this.room.players) {
            const playerRole = this.api.roleService.getPlayerRole(player);
            if (playerRole instanceof Infected) {
                playersInfected.push(player);
            } else if (playerRole instanceof Uninfected) {
                playersUninfected.push(player);
                this.api.hudService.setTaskInteraction(player, true, true);
            }
        }

        this.room.setSettings({ crewmateVision: 1, impostorVision: 1 })
        await this.room.broadcastMessages(
            [
                ...playersInfected.map(infectedPlayer => {
                    return new RpcMessage(
                        infectedPlayer.control!.netId,
                        new SetPlayerSpeedModifierMessage(infectedSpeed)
                    );
                }),
                ...playersInfected.map(infectedPlayer => {
                    return new RpcMessage(
                        infectedPlayer.control!.netId,
                        new SetPlayerVisionModifierMessage(infectedVision)
                    );
                }),
                ...playersUninfected.map(uninfectedPlayer => {
                    return new RpcMessage(
                        uninfectedPlayer.control!.netId,
                        new SetPlayerSpeedModifierMessage(uninfectedSpeed)
                    );
                }),
                ...playersUninfected.map(uninfectedPlayer => {
                    return new RpcMessage(
                        uninfectedPlayer.control!.netId,
                        new SetPlayerVisionModifierMessage(uninfectedVision)
                    );
                })
            ]
        );

        const canInfectedCloseDoors = this.api.gameOptions.gameOptions.get(InfectionOptionName.InfectedCloseDoors)?.getValue<BooleanValue>().enabled || false;
        const canUninfectedCloseDoors = this.api.gameOptions.gameOptions.get(InfectionOptionName.UninfectedCloseDoors)?.getValue<BooleanValue>().enabled || false;
        
        this.api.hudService.setHudItemVisibilityFor(HudItem.MapDoorButtons, canInfectedCloseDoors, playersInfected);
        this.api.hudService.setHudItemVisibilityFor(HudItem.SabotageButton, canInfectedCloseDoors, playersInfected);
        this.api.hudService.setHudItemVisibilityFor(HudItem.MapDoorButtons, canUninfectedCloseDoors, playersUninfected);
        this.api.hudService.setHudItemVisibilityFor(HudItem.SabotageButton, canUninfectedCloseDoors, playersUninfected);

        const spawnLocation = this.api.gameOptions.gameOptions.get(InfectionOptionName.SpawnLocation)?.getValue<EnumValue<InfectionSpawnLocations>>();
        if (!(this.room.shipStatus instanceof AirshipStatus) && !(this.room.shipStatus instanceof SubmergedShipStatus)) {
            setTimeout(() => {
                for (let i = 0; i < playersUninfected.length; i++) {
                    const player = playersUninfected[i];
                    const position = this.getSpawnPosition(playersUninfected.length, i);
                    if (position === undefined) continue;
        
                    const playerTransform = player.transform;
                    if (playerTransform) {
                        player.transform.seqId += 5;
                        player.transform.snapTo(position);
                    }
                }
                for (let i = 0; i < playersInfected.length; i++) {
                    const player = playersInfected[i];
                    const position = this.getInfectedSpawnPosition(player, i);
                    if (position === undefined) continue;
        
                    const playerTransform = player.transform;
                    if (playerTransform) {
                        player.transform.seqId += 5;
                        player.transform.snapTo(position);
                    }
                }
            }, 5000);
        }
        
        await this.checkTaskEndGame(undefined);
    }

    // @EventListener("mwgg.submerged.spawnIn.load")
    // onSubmergedSpawnInLoad(ev: SubmergedSpawnInLoadEvent) {
    //     const players: PlayerData<Room>[] = [];
    //     for (const [ , player ] of this.room.players) {
    //         const playerRole = this.api.roleService.getPlayerRole(player);
    //         if (playerRole instanceof Infected) {
    //             players.push(player);
    //         }
    //     }
    //     for (let i = 0; i < players.length; i++) {
    //         const player = players[i];
    //         ev.spawnInSystem.players.add(player);
    //     }
    // }

    @EventListener("mwgg.submerged.spawnIn.done")
    onSubmergedSpawnInDone(ev: SubmergedSpawnInDoneEvent) {
        const playersInfected: PlayerData<Room>[] = [];
        for (const [ , player ] of this.room.players) {
            const playerRole = this.api.roleService.getPlayerRole(player);
            if (playerRole instanceof Infected) {
                playersInfected.push(player);
            }
        }
        for (let i = 0; i < playersInfected.length; i++) {
            const player = playersInfected[i];
            const position = this.getInfectedSpawnPosition(player, i);
            if (position === undefined) continue;

            const playerTransform = player.transform;
            if (playerTransform) {
                player.transform.seqId += 5;
                player.transform.snapTo(position);
            }
        }
    }

    @EventListener("mwgg.deadbody.spawn")
    async onDeadBodySpawn(ev: DeadBodySpawnEvent) {
        ev.cancel();
    }

    @EventListener("player.leave") 
    async onPlayerLeave(ev: PlayerLeaveEvent) {
        if (this.room.gameState !== GameState.Started)
            return;
        
        const players = this.api.getEndgamePlayers();
        for (const playerRole of players) {
            if (playerRole instanceof Uninfected) {
                await this.checkTaskEndGame(undefined);
                return;
            }
        }
        this.room.registerEndGameIntent(
            new EndGameIntent(
                "uninfected disconnected",
                GameOverReason.HumansDisconnect,
                {
                    endGameScreen: new Map(players.map<[number, EndGameScreen]>(playerRole => {
                        return [
                            playerRole.player.playerId!,
                            {
                                titleText: playerRole instanceof Infected && playerRole.didInfectPlayers() ? "Victory" : Palette.impostorRed.text("Defeat"),
                                subtitleText: playerRole instanceof Infected && !playerRole.didInfectPlayers()
                                    ? `${uninfectedColor.text("Crewmates")} disconnected, but you didn't pass on the infection`
                                    : `${uninfectedColor.text("Crewmates")} disconnected`,
                                backgroundColor: Palette.impostorRed,
                                yourTeam: RoleAlignment.Impostor,
                                winSound: WinSound.ImpostorWin,
                                hasWon: playerRole instanceof Infected
                            }
                        ];
                    }))
                }
            )
        );
    }

    @EventListener("room.endgameintent")
    onEndGameIntent(ev: RoomEndGameIntentEvent<Room>) {
        if (ev.intentName === MouthwashEndGames.ImpostorsDisconnected) {
            ev.cancel();

            const players = this.api.getEndgamePlayers();
            this.room.registerEndGameIntent(
                new EndGameIntent(
                    "infected disconnected",
                    GameOverReason.ImpostorDisconnect,
                    {
                        endGameScreen: new Map(players.map<[number, EndGameScreen]>(playerRole => {
                            return [
                                playerRole.player.playerId!,
                                {
                                    titleText: playerRole instanceof Uninfected ? "Victory" : Palette.impostorRed.text("Defeat"),
                                    subtitleText: `${infectedColor.text("Infected")} disconnected`,
                                    backgroundColor: Palette.crewmateBlue,
                                    yourTeam: RoleAlignment.Crewmate,
                                    winSound: WinSound.CrewmateWin,
                                    hasWon: playerRole instanceof Uninfected
                                }
                            ];
                        }))
                    }
                )
            );
        } else if (ev.intentName === MouthwashEndGames.CrewmatesDisconnected) {
            ev.cancel(); // this end-game intent needs to be registered when there is exactly _0_ crewmates left. 
        } else if (ev.intentName === MouthwashEndGames.CrewmatesCompletedTasks) {
            ev.cancel(); // we handle our own task completion end game below
        }
    }
    
    computeTaskCounts(justInfected?: PlayerData<Room>): { totalTasks: number; completeTasks: number; players: PlayerData<Room>[]; numPlayersWithTasks: number; } {
        let totalTasks = 0;
        let completeTasks = 0;
        let numPlayersWithTasks = 0;
        const players = [];
        for (const [ , player ] of this.room.players) {
            const playerInfo = player.playerInfo;
            if (playerInfo && !playerInfo.isDisconnected && (this.api.hudService.getPlayerHud(player).allowTaskInteraction && justInfected !== player)) {
                numPlayersWithTasks++;
                for (const task of playerInfo.taskStates) {
                    totalTasks++;
                    if (task.completed) {
                        completeTasks++;
                    }
                }
            }
            players.push(player);
        }

        return { totalTasks, completeTasks, players, numPlayersWithTasks };
    }

    async checkTaskEndGame(justInfected?: PlayerData<Room>) {
        const { totalTasks, completeTasks, players, numPlayersWithTasks } = this.computeTaskCounts(justInfected);
        await Promise.all(players.map(player => this.api.hudService.setTaskCounts(player, totalTasks, completeTasks, numPlayersWithTasks)));

        if (totalTasks > 0 && completeTasks >= totalTasks) {
            const endGamePlayers = this.api.getEndgamePlayers();
            this.room.registerEndGameIntent(
                new EndGameIntent(
                    "uninfected crewmates completed tasks",
                    GameOverReason.HumansByTask,
                    {
                        endGameScreen: new Map(endGamePlayers.map<[number, EndGameScreen]>(playerRole => {
                            return [
                                playerRole.player.playerId!,
                                {
                                    titleText: playerRole && !(playerRole instanceof Infected) && playerRole.player !== justInfected
                                        ? "Victory" : Palette.impostorRed.text("Defeat"),
                                    subtitleText: `The uninfected ${Palette.crewmateBlue.text("Crewmates")} completed all of the tasks`,
                                    backgroundColor: Palette.crewmateBlue,
                                    winSound: WinSound.CrewmateWin,
                                    hasWon: !(playerRole instanceof Infected) && playerRole.player !== justInfected
                                }
                            ];
                        }))
                    }
                )
            );
            return true;
        }
        return false;
    }

    @EventListener("player.completetask")
    async onPlayerCompleteTask(ev: PlayerCompleteTaskEvent<Room>) {
        await this.checkTaskEndGame(undefined);
    }
}