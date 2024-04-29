import {
    Connection,
    EndGameIntent,
    EventListener,
    GameDataSetTasksEvent,
    GameOverReason,
    GameState,
    HindenburgPlugin,
    PlayerData,
    PlayerDieEvent,
    PlayerLeaveEvent,
    PlayerReportDeadBodyEvent,
    PreventLoad,
    Room,
    RoomDestroyEvent,
    RoomEndGameIntentEvent,
    RoomGameEndEvent,
    RpcMessage
} from "@skeldjs/hindenburg";

import {
    BaseGamemodePlugin,
    DeadBodySpawnEvent,
    DefaultRoomCategoryName,
    DefaultRoomOptionName,
    EndGameScreen,
    GamemodePlugin,
    GamemodeRolesAssignedEvent,
    MouthwashEndGames,
    RegisterRole,
    RoleAlignment
} from "hbplugin-mouthwashgg-api";

import {
    BooleanValue,
    EnumValue,
    GameOption,
    HudItem,
    HudLocation,
    NumberValue,
    Palette,
    Priority,
    SetPlayerSpeedModifierMessage,
    SetPlayerVisionModifierMessage,
    WinSound
} from "mouthwash-types";

import { SubmergedSpawnInDoneEvent } from "hbplugin-mwgg-map-submerged"; 

import { Hider, Seeker, hiderColor, seekerColor } from "./roles";

export const HnSOptionName = {
    NumSeekers: `${seekerColor.text("Seeker")} Count`,
    ChatAccess: "Chat",
    GameDuration: "Game Duration",
    TaskCompletion: "Task Completion",
    AdminTable: "Admin Table",
    ShowDeadBodies: "Show Dead Bodies"
} as const;

@PreventLoad
@GamemodePlugin({
    id: "hide-and-seek",
    name: "Hide N' Seek",
    version: "1.0.0",
    description: "Hiders are given a headstart to find the best place to hide from the seekers, who hunt down the hiders for the rest of the game.",
    author: "weakeyes, przebot"
})
@RegisterRole(Seeker)
@RegisterRole(Hider)
@HindenburgPlugin("hbplugin-mwgg-gamemode-hns", "1.0.0", "none")
export class HideAndSeekGamemodePlugin extends BaseGamemodePlugin {
    protected _freezeTimerInterval: NodeJS.Timeout|undefined;
    protected _gameTimerInterval: NodeJS.Timeout|undefined;

    protected _currentFreezeTime: number|undefined;
    protected _currentGameTime: number|undefined;

    protected _aliveHiders: Set<PlayerData<Room>>|undefined;

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

        defaultOptions.set(HnSOptionName.TaskCompletion, new GameOption(DefaultRoomCategoryName.CrewmateRoles, HnSOptionName.TaskCompletion, new BooleanValue(true), Priority.E));
        defaultOptions.set(HnSOptionName.NumSeekers, new GameOption(DefaultRoomCategoryName.ImpostorRoles, HnSOptionName.NumSeekers, new NumberValue(1, 1, 1, 3, false, "{0} Seekers"), Priority.F));
        defaultOptions.set(HnSOptionName.ChatAccess, new GameOption(DefaultRoomCategoryName.Config, HnSOptionName.ChatAccess, new EnumValue([ "Off", "Only Hiders", "Everyone" ], 1), Priority.G));
        defaultOptions.set(HnSOptionName.GameDuration, new GameOption(DefaultRoomCategoryName.Config, HnSOptionName.GameDuration, new NumberValue(5, 1, 0, 15, true, "{0}m"), Priority.G + 1));
        defaultOptions.set(HnSOptionName.AdminTable, new GameOption(DefaultRoomCategoryName.Config, HnSOptionName.AdminTable, new BooleanValue(false), Priority.G + 2));
        defaultOptions.set(HnSOptionName.ShowDeadBodies, new GameOption(DefaultRoomCategoryName.Config, HnSOptionName.ShowDeadBodies, new BooleanValue(true), Priority.G + 3));

        return defaultOptions;
    }

    getAdjustedImpostorCount(): number {
        return this.api.roleService.adjustImpostorCount(
            this.api.gameOptions.gameOptions.get(HnSOptionName.NumSeekers)?.getValue<NumberValue>().value ?? 2
        );
    }

    getRoleCounts() {
        const impostorCount = this.getAdjustedImpostorCount();
        return [
            {
                role: Seeker,
                playerCount: impostorCount
            },
            {
                role: Hider,
                playerCount: this.room.players.size - impostorCount
            }
        ];
    }

    protected _formatTime(seconds: number) {
        if (seconds > 60) {
            const minutes = Math.round(seconds / 60);
            if (minutes === 1) return minutes + " minute";
            return minutes + " minutes";
        }

        if (seconds === 1) return seconds + " second";
        return seconds + " seconds";
    }

    @EventListener("mwgg.gamemode.rolesassigned")
    async onInitialRolesAssigned(ev: GamemodeRolesAssignedEvent) {
        const gameLevel = this.api.gameOptions.gameOptions.get(DefaultRoomOptionName.Map)?.getValue<EnumValue<"The Skeld"|"Polus"|"Mira HQ"|"Airship"|"Submerged">>().selectedOption;
        const gameDuration = this.api.gameOptions.gameOptions.get(HnSOptionName.GameDuration)?.getValue<NumberValue>().value!;
        const taskCompletion = this.api.gameOptions.gameOptions.get(HnSOptionName.TaskCompletion)?.getValue<BooleanValue>().enabled!;
        const adminTable = this.api.gameOptions.gameOptions.get(HnSOptionName.AdminTable)?.getValue<BooleanValue>().enabled!;

        const seekers = [];
        const hiders = [];
        this.api.hudService.setHudItemVisibility(HudItem.TaskProgressBar, taskCompletion);
        this.api.hudService.setHudItemVisibility(HudItem.TaskListPopup, taskCompletion);
        this.api.hudService.setHudItemVisibility(HudItem.AdminTable, adminTable);
        this.api.hudService.setHudItemVisibility(HudItem.CallMeetingButton, false);
        this.api.hudService.setHudItemVisibility(HudItem.ReportButton, false);
        for (const [ , player ] of this.room.players) {
            const playerRole = this.api.roleService.getPlayerRole(player);
            if (playerRole instanceof Seeker) {
                seekers.push(player);
                playerRole.setKillButtonEnabled(false);
            } else if (playerRole instanceof Hider) {
                hiders.push(player);
                this.api.hudService.setTaskInteraction(player, taskCompletion);
            }
        }

        for (const seeker of seekers) {
            await this.room.broadcastMessages(
                [
                    new RpcMessage(
                        seeker.control!.netId,
                        new SetPlayerSpeedModifierMessage(0)
                    ),
                    new RpcMessage(
                        seeker.control!.netId,
                        new SetPlayerVisionModifierMessage(0)
                    )
                ],
                [],
                this.room.getRealConnections([ seeker ]),
                undefined,
                true
            );
        }

        this._currentFreezeTime = 15 + (gameLevel === "Airship" ? 10 : 0);
        this._currentGameTime = gameDuration * 60;
        this._aliveHiders = new Set(hiders);
        if (gameLevel !== "Submerged") {
            await this.startSeekerFreezeCountdown(seekers, hiders);
        }
    }

    @EventListener("mwgg.submerged.spawnIn.done")
    async onSubmergedSpawnInDone(ev: SubmergedSpawnInDoneEvent<Room>) {
        const seekers = [];
        const hiders = [];
        for (const [ , player ] of this.room.players) {
            const playerRole = this.api.roleService.getPlayerRole(player);
            if (playerRole instanceof Seeker) {
                seekers.push(player);
            } else if (playerRole instanceof Hider) {
                hiders.push(player);
            }
        }
        await this.startSeekerFreezeCountdown(seekers, hiders)
    }

    async updateReleaseTime(seekers: PlayerData<Room>[], hiders: PlayerData<Room>[]) {
        await Promise.all([
            this.api.hudService.setHudStringFor(HudLocation.RoomTracker, "release-time",
                `You will be released in ${this._formatTime(this._currentFreezeTime!)}`, Priority.A, seekers),
            this.api.hudService.setHudStringFor(HudLocation.RoomTracker, "release-time",
                `${seekerColor.text("Seekers")} will be released in ${this._formatTime(this._currentFreezeTime!)}`, Priority.A, hiders)
        ]);
    }

    async startSeekerFreezeCountdown(seekers: PlayerData<Room>[], hiders: PlayerData<Room>[]) {
        if (this._freezeTimerInterval || this._gameTimerInterval)
            throw new Error("Freeze countdown already started; somehow the countdown interval on game start was called twice?");

        await this.updateReleaseTime(seekers, hiders);
        this._freezeTimerInterval = setInterval(async () => {
            if (this._currentFreezeTime === undefined) throw new Error("Assertion failed; current freeze time was undefined");

            this._currentFreezeTime -= 1;

            if (this._currentFreezeTime <= 0) {
                clearInterval(this._freezeTimerInterval as unknown as number);
                this.startGameTimer(seekers, hiders);
                await this.api.hudService.setHudString(HudLocation.RoomTracker, "release-time", "", Priority.A);
                return;
            }

            await this.updateReleaseTime(seekers, hiders);
        }, 1000);
    }

    async updateSeekersGameTime(seekers: PlayerData<Room>[], hiders: PlayerData<Room>[]) {
        if (this._aliveHiders!.size === 1) {
            await this.api.hudService.setHudStringFor(HudLocation.RoomTracker, "game-time",
                `You have ${this._formatTime(this._currentGameTime!)} to find the last hider!`, Priority.B, seekers);
        } else if (this._aliveHiders!.size < hiders.length) {
            await this.api.hudService.setHudStringFor(HudLocation.RoomTracker, "game-time",
                `You have ${this._formatTime(this._currentGameTime!)} to find the rest of the hiders!`, Priority.B, seekers);
        } else {
            await this.api.hudService.setHudStringFor(HudLocation.RoomTracker, "game-time",
                `You have ${this._formatTime(this._currentGameTime!)} to find the hiders!`, Priority.B, seekers);
        }
    }

    async updateGameTime(seekers: PlayerData<Room>[], hiders: PlayerData<Room>[]) {
        await Promise.all([
            this.updateSeekersGameTime(seekers, hiders),
            this.api.hudService.setHudStringFor(HudLocation.RoomTracker, "game-time",
                `You have ${this._formatTime(this._currentGameTime!)} to hide from the seekers!`, Priority.B, hiders)
        ]);
    }

    async startGameTimer(seekers: PlayerData<Room>[], hiders: PlayerData<Room>[]) {
        await Promise.all(seekers.map(async seeker => {
            const playerRole = this.api.roleService.getPlayerRole(seeker);
            if (playerRole instanceof Seeker) {
                playerRole.setKillButtonEnabled(true);
            }
            await this.room.broadcastMessages(
                [
                    new RpcMessage(
                        seeker.control!.netId,
                        new SetPlayerSpeedModifierMessage(1)
                    ),
                    new RpcMessage(
                        seeker.control!.netId,
                        new SetPlayerVisionModifierMessage(1)
                    )
                ],
                [],
                this.room.getRealConnections([ seeker ]),
                undefined,
                true
            );
        }));
        this.updateGameTime(seekers, hiders);
        this._gameTimerInterval = setInterval(async () => {
            if (this._currentGameTime === undefined) throw new Error("Assertion failed; current game time was undefined");

            this._currentGameTime -= 1;

            if (this._currentGameTime <= 0) {
                let numHidersAlive = 0;
                for (const hider of hiders) {
                    const playerInfo = hider.playerInfo;
                    if (playerInfo && !playerInfo.isDead) {
                        numHidersAlive++;
                    }
                }

                clearInterval(this._gameTimerInterval as unknown as number);

                if (numHidersAlive === 0) {
                    this._endGameToSeekersFindAllHiders();
                    return;
                }

                const gameDuration = this.api.gameOptions.gameOptions.get(HnSOptionName.GameDuration)?.getValue<NumberValue>().value!;
                const players = this.api.getEndgamePlayers();
                const taskCompletion = this.api.gameOptions.gameOptions.get(HnSOptionName.TaskCompletion)?.getValue<BooleanValue>().enabled!;
                this.room.registerEndGameIntent(
                    new EndGameIntent(
                        "seekers failed to find all of the hiders",
                        GameOverReason.HumansByTask,
                        {
                            endGameScreen: new Map(players.map<[number, EndGameScreen]>(playerRole => {
                                if (taskCompletion) {
                                    return [
                                        playerRole.player.playerId!,
                                        {
                                            titleText: Palette.impostorRed.text("Defeat"),
                                            subtitleText: `No-one completed their objective in time`,
                                            backgroundColor: Palette.grey,
                                            yourTeam: RoleAlignment.All,
                                            winSound: WinSound.ImpostorWin,
                                            hasWon: false
                                        }
                                    ];
                                } else {
                                    return [
                                        playerRole.player.playerId!,
                                        {
                                            titleText: playerRole instanceof Hider ? "Victory" : Palette.impostorRed.text("Defeat"),
                                            subtitleText: gameDuration === 0
                                                ? `The ${hiderColor.text("Hiders")} hid from the ${seekerColor.text("Seekers")}`
                                                : `The ${hiderColor.text("Hiders")} hid from the ${seekerColor.text("Seekers")} for ${gameDuration} minute${gameDuration === 1 ? "" : "s"}`,
                                            backgroundColor: Palette.crewmateBlue,
                                            yourTeam: RoleAlignment.Crewmate,
                                            winSound: WinSound.CrewmateWin,
                                            hasWon: playerRole instanceof Hider
                                        }
                                    ];
                                }
                            }))
                        }
                    )
                );
                return;
            }

            await this.updateGameTime(seekers, hiders);
        }, 1000);
    }

    protected _endGameToSeekersFindAllHiders() {
        const players = this.api.getEndgamePlayers();
        this.room.registerEndGameIntent(
            new EndGameIntent(
                "seeker find all hiders",
                GameOverReason.ImpostorByKill,
                {
                    endGameScreen: new Map(players.map<[number, EndGameScreen]>(playerRole => {
                        return [
                            playerRole.player.playerId!,
                            {
                                titleText: playerRole instanceof Seeker ? "Victory" : Palette.impostorRed.text("Defeat"),
                                subtitleText: playerRole instanceof Seeker
                                    ? `You caught all of the ${hiderColor.text("Hiders")}`
                                    : `The ${seekerColor.text("Seekers")} caught all of the ${hiderColor.text("Hiders")}`,
                                backgroundColor: Palette.impostorRed,
                                yourTeam: RoleAlignment.Impostor,
                                winSound: WinSound.ImpostorWin,
                                hasWon: playerRole instanceof Seeker
                            }
                        ];
                    }))
                }
            )
        );
    }

    protected _removeHiderPlayer(player: PlayerData<Room>, disconnect: boolean) {
        if (!this._aliveHiders)
            return;

        const previousSize = this._aliveHiders.size;
        this._aliveHiders.delete(player);
        if (this._aliveHiders.size === 0 && previousSize !== this._aliveHiders.size) {
            if (disconnect) {
                const players = this.api.getEndgamePlayers();
                this.room.registerEndGameIntent(
                    new EndGameIntent(
                        "hiders disconnected",
                        GameOverReason.HumansDisconnect,
                        {
                            endGameScreen: new Map(players.map<[number, EndGameScreen]>(playerRole => {
                                return [
                                    playerRole.player.playerId!,
                                    {
                                        titleText: playerRole instanceof Seeker ? "Victory" : Palette.impostorRed.text("Defeat"),
                                        subtitleText: `${hiderColor.text("Hiders")} disconnected`,
                                        backgroundColor: Palette.impostorRed,
                                        yourTeam: RoleAlignment.Impostor,
                                        winSound: WinSound.ImpostorWin,
                                        hasWon: playerRole instanceof Seeker
                                    }
                                ];
                            }))
                        }
                    )
                );
            } else {
                this._endGameToSeekersFindAllHiders();
            }
        }
    }

    haltTimerIntervals() {
        clearInterval(this._freezeTimerInterval as unknown as number);
        clearInterval(this._gameTimerInterval as unknown as number);
    }

    @EventListener("gamedata.settasks")
    async onGameDataSetTasks(ev: GameDataSetTasksEvent) {
        const taskCompletion = this.api.gameOptions.gameOptions.get(HnSOptionName.TaskCompletion)?.getValue<BooleanValue>().enabled!;
        if (!taskCompletion) {
            ev.setTasks([]);
        }
    }

    @EventListener("player.die")
    onPlayerDie(ev: PlayerDieEvent<Room>) {
        this._removeHiderPlayer(ev.player, false);
    }

    @EventListener("player.leave")
    onPlayerLeave(ev: PlayerLeaveEvent<Room>) {
        if (this.room.gameState !== GameState.Started)
            return;
        
        this._removeHiderPlayer(ev.player, true);
    }

    @EventListener("room.endgameintent")
    onRoomEndGameIntent(ev: RoomEndGameIntentEvent<Room>) {
        if (ev.intentName === MouthwashEndGames.CrewmatesCompletedTasks) {
            ev.cancel();
            
            const taskCompletion = this.api.gameOptions.gameOptions.get(HnSOptionName.TaskCompletion)?.getValue<BooleanValue>().enabled!;
            if (taskCompletion) {
                const players = this.api.getEndgamePlayers();
                this.room.registerEndGameIntent(
                    new EndGameIntent(
                        "hiders complete tasks",
                        GameOverReason.HumansByTask,
                        {
                            endGameScreen: new Map(players.map<[number, EndGameScreen]>(playerRole => {
                                return [
                                    playerRole.player.playerId!,
                                    {
                                        titleText: playerRole instanceof Hider ? "Victory" : Palette.impostorRed.text("Defeat"),
                                        subtitleText: `The ${hiderColor.text("Hiders")} completed all of the tasks`,
                                        backgroundColor: Palette.crewmateBlue,
                                        winSound: WinSound.CrewmateWin,
                                        hasWon: playerRole instanceof Hider
                                    }
                                ];
                            }))
                        }
                    )
                );
            }
        } else if (ev.intentName === MouthwashEndGames.ImpostorsDisconnected) {
            ev.cancel();

            const players = this.api.getEndgamePlayers();
            this.room.registerEndGameIntent(
                new EndGameIntent(
                    "seekers disconnected",
                    GameOverReason.ImpostorDisconnect,
                    {
                        endGameScreen: new Map(players.map<[number, EndGameScreen]>(playerRole => {
                            return [
                                playerRole.player.playerId!,
                                {
                                    titleText: playerRole instanceof Hider ? "Victory" : Palette.impostorRed.text("Defeat"),
                                    subtitleText: `${seekerColor.text("Seekers")} disconnected`,
                                    backgroundColor: Palette.crewmateBlue,
                                    yourTeam: RoleAlignment.Crewmate,
                                    winSound: WinSound.CrewmateWin,
                                    hasWon: playerRole instanceof Hider
                                }
                            ];
                        }))
                    }
                )
            );
        } else if (ev.intentName === MouthwashEndGames.CrewmatesDisconnected) {
            ev.cancel(); // this end-game intent needs to be registered when there is exactly _0_ crewmates left. 
        }
    }

    @EventListener("room.gameend")
    onRoomEnd(ev: RoomGameEndEvent) {
        this.haltTimerIntervals();
    }

    @EventListener("room.destroy")
    onRoomDestroy(ev: RoomDestroyEvent) {
        this.haltTimerIntervals();
    }

    @EventListener("mwgg.deadbody.spawn")
    onDeadBodySpawn(ev: DeadBodySpawnEvent) {
        const showDeadBodies = this.api.gameOptions.gameOptions.get(HnSOptionName.ShowDeadBodies)?.getValue<BooleanValue>().enabled!;
        if (!showDeadBodies) {
            ev.cancel();
        }
    }

    @EventListener("player.reportbody")
    onReportDeadBody(ev: PlayerReportDeadBodyEvent) {
        ev.cancel();
    }
}