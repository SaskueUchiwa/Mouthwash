import {
    ClientLeaveEvent,
    Connection,
    EventListener,
    Room,
    RoomPlugin,
    HindenburgPlugin,
    PlayerSendChatEvent,
    PlayerJoinEvent,
    PlayerLeaveEvent,
    PlayerCheckNameEvent,
    RoomGameStartEvent,
    GameMap,
    RoomFixedUpdateEvent,
    PlayerDieEvent,
    RoomEndGameIntentEvent,
    AmongUsEndGames,
    EndGameIntent,
    GameOverReason,
    PlayerInfo,
    PlayersDisconnectEndgameMetadata,
    PlayersVoteOutEndgameMetadata,
    RoomGameEndEvent,
    ReliablePacket,
    TaskBarMode,
    PlayerCompleteTaskEvent,
    PlayerMurderEvent,
    PlayerStartMeetingEvent,
    PlayerData,
    RoomGameReadyEvent,
    PlayerSendQuickChatEvent,
    RoomAssignRolesEvent,
    DisconnectReason
} from "@skeldjs/hindenburg";

import { MouthwashAuthPlugin } from "hbplugin-mouthwashgg-auth";

import {
    GameOption,
    EnumValue,
    NumberValue,
    BooleanValue,
    FetchResponseType,
    HudLocation,
    Palette,
    Priority,
    OverwriteGameOver,
    WinSound,
    DeadBodyReportEvent,
    RGBA,
    EdgeAlignment
} from "mouthwash-types";

import {
    AnimationService,
    AssetLoaderService,
    CameraControllerService,
    ChatService,
    DefaultRoomOptionName,
    DefaultRoomCategoryName,
    GameOptionsService,
    HudService,
    NameService,
    QrCodeService,
    RoleService,
    SoundService,
    SpoofInfoService,
    AssetBundle,
    AnyTaskbarUpdate,
    AnyKillDistance,
    DeadBodyService,
    AssetReference,
    TargettableService,
    AssetBundleIds,
    ButtonSpawnInfo,
    Crewmate
} from "./services";

import {
    ButtonFixedUpdateEvent,
    ClientFetchResourceResponseEvent,
    GamemodeBeforeRolesAssignedEvent,
    GamemodeGameEndEvent,
    GamemodeRolesAssignedEvent,
    MouthwashUpdateGameOptionEvent
} from "./events";

import {
    BaseGamemodePlugin,
    BaseRole,
    EndGameScreen,
    getRegisteredBundles,
    getRegisteredRoles,
    isMouthwashGamemode,
    MouthwashEndGames,
    RoleAlignment
} from "./api";
import { CosmeticsService } from "./services/cosmeticsService";
import { BasicMouthwashRole } from "./roles";

const mapNameToNumber = {
    "The Skeld": GameMap.TheSkeld,
    "Mira HQ": GameMap.MiraHQ,
    "Polus": GameMap.Polus,
    "Airship": GameMap.Airship,
    "Submerged": 5
};

const taskBarUpdateNameToNumber = {
    "Always": TaskBarMode.Normal,
    "Meetings": TaskBarMode.MeetingOnly,
    "Never": TaskBarMode.Invisible
};

const killDistanceNameToNumber = {
    "Really Short": 0.5,
    "Short": 1,
    "Medium": 2,
    "Long": 3
};

@HindenburgPlugin("hbplugin-mouthwashgg-api", "1.0.0", "none")
export class MouthwashApiPlugin extends RoomPlugin {
    authApi?: MouthwashAuthPlugin;

    animationService: AnimationService;
    assetLoader: AssetLoaderService;
    cameraControllers: CameraControllerService;
    chatService: ChatService;
    cosmeticsService: CosmeticsService;
    deadBodyService: DeadBodyService;
    gameOptions: GameOptionsService;
    hudService: HudService;
    nameService: NameService;
    qrCodeService: QrCodeService;
    roleService: RoleService;
    soundService: SoundService;
    spoofInfoService: SpoofInfoService;
    targettableService: TargettableService;

    gamemode?: BaseGamemodePlugin;
    allGamemodes: Map<string, typeof BaseGamemodePlugin>;

    roomCreator?: Connection;

    constructor(
        public readonly room: Room,
        public readonly config: any
    ) {
        super(room, config);

        this.animationService = new AnimationService(this);
        this.assetLoader = new AssetLoaderService(this);
        this.cameraControllers = new CameraControllerService(this);
        this.chatService = new ChatService(this);
        this.cosmeticsService = new CosmeticsService(this);
        this.deadBodyService = new DeadBodyService(this);
        this.gameOptions = new GameOptionsService(this);
        this.hudService = new HudService(this);
        this.nameService = new NameService(this);
        this.qrCodeService = new QrCodeService(this);
        this.roleService = new RoleService(this);
        this.soundService = new SoundService(this);
        this.spoofInfoService = new SpoofInfoService;
        this.targettableService = new TargettableService;

        this.allGamemodes = new Map;
    }

    async onPluginLoad() {
        if (!this.room.config.serverAsHost)
            this.room.setSaaHEnabled(true, true);

        for (const [ , importedPlugin ] of this.worker.pluginLoader.importedPlugins) {
            if (importedPlugin.isRoomPlugin()) {
                if (isMouthwashGamemode(importedPlugin.pluginCtr)) {
                    const gamemodePlugin = importedPlugin.pluginCtr as typeof BaseGamemodePlugin;
                    this.allGamemodes.set(gamemodePlugin.gamemodeMetadata.name, gamemodePlugin);
                }
            }
        }

        this.authApi = this.assertDependency("hbplugin-mouthwashgg-auth", "worker") as MouthwashAuthPlugin|undefined;
        await this.assetLoader.loadGlobalAsset();
    }

    createDefaultOptions() {
        return new Map<string, GameOption>([
            [DefaultRoomOptionName.Map, new GameOption(DefaultRoomCategoryName.None, DefaultRoomOptionName.Map, new EnumValue([ "The Skeld", "Polus", "Mira HQ", "Airship", "Submerged" ], 0), Priority.A)],
            [DefaultRoomOptionName.ImpostorCount, new GameOption(DefaultRoomCategoryName.None, DefaultRoomOptionName.ImpostorCount, new NumberValue(2, 1, 1, 3, false, "{0} Impostors"), Priority.A + 1)],
            [DefaultRoomOptionName.MaxPlayerCount, new GameOption(DefaultRoomCategoryName.None, DefaultRoomOptionName.MaxPlayerCount, new NumberValue(15, 1, 4, 15, false, "{0} Players"), Priority.A + 2)],
            [DefaultRoomOptionName.PlayerSpeed, new GameOption(DefaultRoomCategoryName.None, DefaultRoomOptionName.PlayerSpeed, new NumberValue(1.25, 0.25, 0.25, 3, false, "{0}x"), Priority.A + 3)],
            [DefaultRoomOptionName.AnonymousVotes, new GameOption(DefaultRoomCategoryName.Meetings, DefaultRoomOptionName.AnonymousVotes, new BooleanValue(false), Priority.B)],
            [DefaultRoomOptionName.ConfirmEjects, new GameOption(DefaultRoomCategoryName.Meetings, DefaultRoomOptionName.ConfirmEjects, new BooleanValue(false), Priority.B + 1)],
            [DefaultRoomOptionName.DiscussionTime, new GameOption(DefaultRoomCategoryName.Meetings, DefaultRoomOptionName.DiscussionTime, new NumberValue(15, 15, 0, 300, false, "{0}s"), Priority.B + 2)],
            [DefaultRoomOptionName.VotingTime, new GameOption(DefaultRoomCategoryName.Meetings, DefaultRoomOptionName.VotingTime, new NumberValue(150, 30, 0, 300, true, "{0}s"), Priority.B + 3)],
            [DefaultRoomOptionName.EmergencyCooldown, new GameOption(DefaultRoomCategoryName.Meetings, DefaultRoomOptionName.EmergencyCooldown, new NumberValue(20, 5, 0, 60, false, "{0}s"), Priority.B + 4)],
            [DefaultRoomOptionName.EmergencyMeetings, new GameOption(DefaultRoomCategoryName.Meetings, DefaultRoomOptionName.EmergencyMeetings, new NumberValue(1, 1, 0, 9, false, "{0} Buttons"), Priority.B + 5)],
            [DefaultRoomOptionName.VisualTasks, new GameOption(DefaultRoomCategoryName.Tasks, DefaultRoomOptionName.VisualTasks, new BooleanValue(false), Priority.C)],
            [DefaultRoomOptionName.TaskBarUpdates, new GameOption(DefaultRoomCategoryName.Tasks, DefaultRoomOptionName.TaskBarUpdates, new EnumValue(["Always", "Meetings", "Never"], 0), Priority.C + 1)],
            [DefaultRoomOptionName.CommonTasks, new GameOption(DefaultRoomCategoryName.Tasks, DefaultRoomOptionName.CommonTasks, new NumberValue(1, 1, 0, 2, false, "{0} tasks"), Priority.C + 2)],
            [DefaultRoomOptionName.LongTasks, new GameOption(DefaultRoomCategoryName.Tasks, DefaultRoomOptionName.LongTasks, new NumberValue(2, 1, 0, 3, false, "{0} tasks"), Priority.C + 3)],
            [DefaultRoomOptionName.ShortTasks, new GameOption(DefaultRoomCategoryName.Tasks, DefaultRoomOptionName.ShortTasks, new NumberValue(3, 1, 0, 5, false, "{0} tasks"), Priority.C + 4)],
            [DefaultRoomOptionName.CrewmateVision, new GameOption(DefaultRoomCategoryName.Roles, DefaultRoomOptionName.CrewmateVision, new NumberValue(0.75, 0.25, 0.25, 3, false, "{0}x"), Priority.D)],
            [DefaultRoomOptionName.ImpostorVision, new GameOption(DefaultRoomCategoryName.Roles, DefaultRoomOptionName.ImpostorVision, new NumberValue(0.75, 0.25, 0.25, 3, false, "{0}x"), Priority.D + 1)],
            [DefaultRoomOptionName.ImpostorKillCooldown, new GameOption(DefaultRoomCategoryName.Roles, DefaultRoomOptionName.ImpostorKillCooldown, new NumberValue(30, 2.5, 5, 60, false, "{0}s"), Priority.D + 2)],
            [DefaultRoomOptionName.ImpostorKillDistance, new GameOption(DefaultRoomCategoryName.Roles, DefaultRoomOptionName.ImpostorKillDistance, new EnumValue<AnyKillDistance>(["Really Short", "Short", "Medium", "Long"], 1), Priority.D + 3)]
        ]);
    }

    async setGamemode(gamemodePluginCtr: typeof BaseGamemodePlugin, doTransition: boolean) {
        if (this.gamemode) {
            this.worker.pluginLoader.unloadPlugin(this.gamemode, this.room);
        }

        const gamemodePlugin = await this.worker.pluginLoader.loadPlugin(gamemodePluginCtr.meta.id, this.room) as BaseGamemodePlugin;

        const registeredRoles = getRegisteredRoles(gamemodePluginCtr);
        for (const registeredRole of registeredRoles) {
            gamemodePlugin.registeredRoles.push(registeredRole);
        }

        const registeredBundles = getRegisteredBundles(gamemodePluginCtr);
        const promises = [];
        for (const registeredBundle of registeredBundles) {
            promises.push(AssetBundle.loadFromUrl(AssetBundleIds[registeredBundle], false));
        }
        gamemodePlugin.registeredBundles = await Promise.all(promises);

        this.gamemode = gamemodePlugin;
        if (doTransition) {
            await this.doGameOptionTransition();
        }
    }

    async doGameOptionTransition() {
        if (this.gamemode) {
            let help = 0;
            while (true) {
                const newGameOptions = this.gamemode.getGameOptions();

                let i = 0;
                for (const registeredRole of this.gamemode.registeredRoles) {
                    const roleOptions = registeredRole.getGameOptions(this.gameOptions.gameOptions);
                    let j = 0;
                    for (const [ key, option ] of roleOptions) {
                        newGameOptions.set(key, new GameOption(DefaultRoomCategoryName.Config, option.key, option.value, Priority.H + i * 100 + j));
                        j++;
                    }
                    i++;
                }

                for (const [ , option ] of newGameOptions) {
                    this.gameOptions.updateOptionFromCache(option);
                }

                if (!await this.gameOptions.transitionTo(newGameOptions))
                    break;

                help++;
                if (help >= 5) {
                    this.logger.warn("2 options in 2 different categories likely have the same name and is causing an infinite loop, breaking..")
                    break;
                }
            }
        }
    }

    updateDefaultSettings() {
        this.room.setSettings({
            map: mapNameToNumber[this.gameOptions.gameOptions.get(DefaultRoomOptionName.Map)?.getValue<EnumValue<keyof typeof mapNameToNumber>>().selectedOption || "The Skeld"],
            numImpostors: this.gameOptions.gameOptions.get(DefaultRoomOptionName.ImpostorCount)?.getValue<NumberValue>().value,
            maxPlayers: this.gameOptions.gameOptions.get(DefaultRoomOptionName.MaxPlayerCount)?.getValue<NumberValue>().value,
            playerSpeed: this.gameOptions.gameOptions.get(DefaultRoomOptionName.PlayerSpeed)?.getValue<NumberValue>().value,
            anonymousVotes: this.gameOptions.gameOptions.get(DefaultRoomOptionName.AnonymousVotes)?.getValue<BooleanValue>().enabled,
            confirmEjects: this.gameOptions.gameOptions.get(DefaultRoomOptionName.ConfirmEjects)?.getValue<BooleanValue>().enabled,
            discussionTime: this.gameOptions.gameOptions.get(DefaultRoomOptionName.DiscussionTime)?.getValue<NumberValue>().value,
            votingTime: this.gameOptions.gameOptions.get(DefaultRoomOptionName.VotingTime)?.getValue<NumberValue>().value,
            emergencyCooldown: this.gameOptions.gameOptions.get(DefaultRoomOptionName.EmergencyCooldown)?.getValue<NumberValue>().value,
            numEmergencies: this.gameOptions.gameOptions.get(DefaultRoomOptionName.EmergencyMeetings)?.getValue<NumberValue>().value,
            visualTasks: this.gameOptions.gameOptions.get(DefaultRoomOptionName.VisualTasks)?.getValue<BooleanValue>().enabled,
            taskbarUpdates: taskBarUpdateNameToNumber[this.gameOptions.gameOptions.get(DefaultRoomOptionName.TaskBarUpdates)?.getValue<EnumValue<AnyTaskbarUpdate>>().selectedOption || "Always"],
            commonTasks: this.gameOptions.gameOptions.get(DefaultRoomOptionName.CommonTasks)?.getValue<NumberValue>().value,
            longTasks: this.gameOptions.gameOptions.get(DefaultRoomOptionName.LongTasks)?.getValue<NumberValue>().value,
            shortTasks: this.gameOptions.gameOptions.get(DefaultRoomOptionName.ShortTasks)?.getValue<NumberValue>().value,
            crewmateVision: this.gameOptions.gameOptions.get(DefaultRoomOptionName.CrewmateVision)?.getValue<NumberValue>().value,
            impostorVision: this.gameOptions.gameOptions.get(DefaultRoomOptionName.ImpostorVision)?.getValue<NumberValue>().value,
            killCooldown: this.gameOptions.gameOptions.get(DefaultRoomOptionName.ImpostorKillCooldown)?.getValue<NumberValue>().value,
            killDistance: killDistanceNameToNumber[this.gameOptions.gameOptions.get(DefaultRoomOptionName.ImpostorKillDistance)?.getValue<EnumValue<AnyKillDistance>>().selectedOption || "Short"]
        });
    }

    @EventListener("player.join")
    async onPlayerJoin(ev: PlayerJoinEvent<Room>) {
        const connection = ev.room.connections.get(ev.player.clientId);

        if (!connection)
            return;
            
        await this.assetLoader.assertLoaded(connection, this.assetLoader.globalAssets!);
    }

    async updateUserSettings(clientId: string) {
        if (!this.authApi)
            return;

        const gameSettings: any = {};
        for (const [ gameOptionPath, gameOptionValue ] of this.gameOptions.cachedValues) {
            gameSettings[gameOptionPath] = gameOptionValue.toJSON();
        }
        await this.authApi.updateUserSettings(clientId, gameSettings);
    }

    async updateUserCosmetics(connection: Connection) {
        if (!this.authApi) return;

        const player = connection.getPlayer();
        if (!player) return;

        const playerInfo = player.playerInfo;
        if (!playerInfo) return;

        const connectionUser = await this.authApi.getConnectionUser(connection);
        if (!connectionUser) return;

        if (
            connectionUser.cosmetic_hat !== playerInfo.defaultOutfit.hatId
            || connectionUser.cosmetic_pet !== playerInfo.defaultOutfit.petId
            || connectionUser.cosmetic_skin !== playerInfo.defaultOutfit.skinId
            || connectionUser.cosmetic_color !== playerInfo.defaultOutfit.color
            || connectionUser.cosmetic_visor !== playerInfo.defaultOutfit.visorId
            || connectionUser.cosmetic_nameplate !== playerInfo.defaultOutfit.nameplateId
        ) {
            await this.authApi.updateUserCosmetics(connectionUser.id, playerInfo.defaultOutfit.hatId, playerInfo.defaultOutfit.petId, playerInfo.defaultOutfit.skinId, playerInfo.defaultOutfit.color, playerInfo.defaultOutfit.visorId, playerInfo.defaultOutfit.nameplateId);
        }
    }

    @EventListener("client.leave")
    async onClientLeave(ev: ClientLeaveEvent) {
        await this.updateUserCosmetics(ev.client);
        if (ev.client === this.roomCreator && this.authApi) {
            const connectionUser = await this.authApi.getConnectionUser(ev.client);
            if (connectionUser) {
                await this.updateUserSettings(connectionUser.id);
            }
        }
    }

    @EventListener("player.leave")
    async onPlayerLeave(ev: PlayerLeaveEvent<Room>) {
        const connection = this.room.connections.get(ev.player.clientId);
        if (!connection) return;

        this.cameraControllers.despawnCamera(ev.player);
    }

    @EventListener("player.checkname")
    async onCheckName(ev: PlayerCheckNameEvent<Room>) {
        ev.cancel();

        if (!this.authApi) return;
    
        const connection = ev.room.connections.get(ev.player.clientId);
        if (!connection) return;

        const connectionUser = await this.authApi.getConnectionUser(connection, true);
        if (!connectionUser) {
            await connection.disconnect("Invalid login");
            return;
        }

        if (!this.roomCreator) this.roomCreator = connection;
        
        if (ev.player.playerInfo) {
            ev.player.playerInfo.defaultOutfit.name = connectionUser.display_name;
        }

        await this.nameService.updateAllNames();

        const coloredNamePerk = connectionUser.perks.find(perk => perk.id === "NAME_COLOR");
        if (coloredNamePerk) {
            await this.nameService.addColor(ev.player, new RGBA(coloredNamePerk.settings.rgba));
        }

        if (ev.player.isHost) {
            if (this.authApi) {
                const keys = Object.keys(connectionUser.game_settings);
                for (let i = 0; i < keys.length; i++) {
                    const gameOptionPath = keys[i];
                    const gameOptionValue = connectionUser.game_settings[gameOptionPath];

                    if (gameOptionValue.type === "enum") {
                        const gameOption = new EnumValue<string>(gameOptionValue.options, gameOptionValue.selectedIdx);
                        this.gameOptions.cachedValues.set(gameOptionPath, gameOption);
                    } else if (gameOptionValue.type === "boolean") {
                        const gameOption = new BooleanValue(gameOptionValue.enabled);
                        this.gameOptions.cachedValues.set(gameOptionPath, gameOption);
                    } else if (gameOptionValue.type === "number") {
                        const gameOption = new NumberValue(
                            gameOptionValue.value,
                            gameOptionValue.step,
                            gameOptionValue.lower,
                            gameOptionValue.upper,
                            gameOptionValue.zeroIsInfinity,
                            gameOptionValue.suffix,
                        );
                        this.gameOptions.cachedValues.set(gameOptionPath, gameOption);
                    }
                }
            }

            const gamemodeOption = await this.gameOptions.createOptionWithCache(
                new GameOption(
                    DefaultRoomCategoryName.None,
                    DefaultRoomOptionName.Gamemode,
                    new EnumValue([...this.allGamemodes.keys()], 0),
                    Priority.A
                )
            );

            const selectedGamemode = this.allGamemodes.get(gamemodeOption.getValue<EnumValue<string>>()!.selectedOption);
            if (selectedGamemode) {
                await this.setGamemode(selectedGamemode, true);
            }

            this.updateDefaultSettings();
        } else {
            this.gameOptions.syncFor([ connection ]);
        }
        
        try {
            await this.cameraControllers.spawnCameraFor(ev.player);
        } catch (e: any) {
            // if there's an error then the player could cheat without a camera object,
            // so it's better to just let them try again
            connection.disconnect(DisconnectReason.ServerRequest)
        }

        const asset = await this.assetLoader.resolveAssetReferenceFor(new AssetReference("PggResources/Global", "Assets/Mods/OfficialAssets/KillButton.png"), [ ev.player ]);

        if (!asset)
            return undefined;
        
        const waitingForPlayerIdx = this.room.actingHostWaitingFor.indexOf(ev.player);
        if (waitingForPlayerIdx > -1) {
            if (this.room.actingHostsEnabled) {
                for (const actingHostId of this.room.actingHostIds) {
                    const actingHostConn = this.room.connections.get(actingHostId);
                    if (actingHostConn) {
                        await this.room.updateHostForClient(actingHostId, actingHostConn);
                    }
                }
            }
            this.room.actingHostWaitingFor.splice(waitingForPlayerIdx, 1);
        }

        const playerControl = ev.player.control;
        if (playerControl) {
            await this.cosmeticsService.loadClientCosmeticsToRoom(connection);
            await this.cosmeticsService.loadRoomCosmeticsForClient(connection);
            await this.cosmeticsService.updatePlayerCosmetics(connection, playerControl);
            await this.cosmeticsService.updateRoomCosmeticsForClient(connection);
        }
    }

    @EventListener("room.fixedupdate")
    async onRoomFixedUpdate(ev: RoomFixedUpdateEvent<Room>) {
        const players = [];
        for (const [ , player ] of this.room.players) {
            players.push(player);
        }
        await this.room.emit(new ButtonFixedUpdateEvent(players));
    }

    @EventListener("mwgg.gameoption.update")
    async onGameOptionUpdate(ev: MouthwashUpdateGameOptionEvent) {
        if (ev.optionKey === DefaultRoomOptionName.Gamemode) {
            const newValue = ev.getNewValue<EnumValue<string>>().selectedOption;
            if (ev.getOldValue<EnumValue<string>>().selectedOption !== newValue) {
                await this.setGamemode(this.allGamemodes.get(newValue)!, false);
            }
        }

        if (ev.optionKey === DefaultRoomOptionName.PlayerSpeed || ev.optionKey === DefaultRoomOptionName.MaxPlayerCount) {
            this.updateDefaultSettings();
        }

        if (ev.optionKey === DefaultRoomOptionName.CommonTasks || ev.optionKey === DefaultRoomOptionName.LongTasks || ev.optionKey === DefaultRoomOptionName.ShortTasks) {
            const commonTasks = this.gameOptions.gameOptions.get(DefaultRoomOptionName.CommonTasks)?.getValue<NumberValue>();
            const longTasks = this.gameOptions.gameOptions.get(DefaultRoomOptionName.LongTasks)?.getValue<NumberValue>();
            const shortTasks = this.gameOptions.gameOptions.get(DefaultRoomOptionName.ShortTasks)?.getValue<NumberValue>();

            if (commonTasks && longTasks && shortTasks && commonTasks.isRoughlyEqual(0) && longTasks.isRoughlyEqual(0) && shortTasks.isRoughlyEqual(0)) {
                ev.revert();
            }
        }

        if (this.gamemode) {
            await this.doGameOptionTransition();
        }
    }

    @EventListener("mwgg.client.fetchresponse")
    onFetchResponse(ev: ClientFetchResourceResponseEvent) {
        const assetBundle = this.assetLoader.getWaitingFor(ev.client).get(ev.resourceId);

        if (!assetBundle)
            return;

        if (ev.response.responseType === FetchResponseType.Failed) {
            this.logger.warn("Failed to load asset bundle %s for %s (%s)",
                assetBundle.url, ev.client, ev.response.reason);
            return ev.client.disconnect("Failed to load asset bundle: " + assetBundle.url + " (" + ev.response.reason + ")"); // todo: report these somehow
        }

        if (ev.response.responseType === FetchResponseType.Invalid) {
            this.logger.warn("Invalid asset bundle hash for %s for %s (%s)",
                assetBundle.url, ev.client, assetBundle.fileHash);
            return ev.client.disconnect("Invalid asset bundle hash: " + assetBundle.url + " (" + assetBundle.fileHash + ")");
        }

        if (ev.response.responseType === FetchResponseType.Ended) {
            this.assetLoader.onLoaded(ev.client, assetBundle);
        }
    }

    @EventListener("player.chat")
    async onPlayerChat(ev: PlayerSendChatEvent<Room>) {
        if (ev.message?.canceled)
            return;

        ev.message?.cancel();

        const recipients = this.chatService.getStandardRecipients(ev.player);
        const appearance = this.chatService.getStandardAppearance(ev.player, false);
        const chatMessage = this.chatService.createMessageFor(ev.chatMessage, appearance, ev.player, recipients);

        await this.chatService.broadcastMessage(chatMessage);
    }

    @EventListener("player.quickchat")
    async onPlayerQuickChat(ev: PlayerSendQuickChatEvent<Room>) {
        if (ev.message?.canceled)
            return;

        ev.message?.cancel();

        const recipients = this.chatService.getStandardRecipients(ev.player);
        const appearance = this.chatService.getStandardAppearance(ev.player, false);
        const chatMessage = this.chatService.createMessageFor(ev.chatMessage, appearance, ev.player, recipients);

        await this.chatService.broadcastMessage(chatMessage);
    }

    // @EventListener("room.selectimpostors")
    // async onSelectImpostors(ev: RoomSelectImpostorsEvent<Room>) {
    //     ev.cancel();
    //     if (this.room.host?.control) {
    //         await this.room.broadcast([
    //             new RpcMessage(
    //                 this.room.host.control.netId,
    //                 new SetInfectedMessage([])
    //             )
    //         ]);
    //     }
    // }

    @EventListener("room.gamestart")
    async onGameStart(ev: RoomGameStartEvent) {
        if (!this.room.gameData) {
            this.logger.warn("No gamedata for room!");
            return;
        }
        
        this.updateDefaultSettings();
        
        if (this.authApi) {
            const promises = [];
            for (const [ , connection ] of this.room.connections) {
                promises.push(this.updateUserCosmetics(connection));
            }
            await Promise.all(promises);

            if (this.roomCreator && !this.roomCreator.sentDisconnect) {
                const connectionUser = await this.authApi.getConnectionUser(this.roomCreator);
                if (connectionUser) {
                    await this.updateUserSettings(connectionUser.id);
                }
            }
        }

        if (this.gamemode) {
            const promises = [];
            for (const [ , connection ] of this.room.connections) {
                for (const assetBundle of this.gamemode.registeredBundles) {
                    await this.assetLoader.assertLoaded(connection, assetBundle);
                    promises.push(this.assetLoader.waitForLoaded(connection, assetBundle).catch(() => {}));
                }
            }
            await Promise.all(promises);
        }
    }

    getEndgamePlayers() {
        const players: BaseRole[] = [];
        for (const [ , player ] of this.room.players) {
            const playerRole = this.roleService.getPlayerRole(player);
            if (playerRole !== undefined) {
                players.push(playerRole);
            }
        }
        return players;
    }

    @EventListener("room.assignroles") // we assign our own roles!
    onRoomAssignRoles(ev: RoomAssignRolesEvent<Room>) {
        for (const [ player ] of ev.roleAssignments) {
            ev.setAssignment(player, BasicMouthwashRole() /* skeldjs/among us crewmate role */);
        }
    }

    @EventListener("room.endgameintent")
    onEndGameIntent(ev: RoomEndGameIntentEvent<Room>) {
        if (ev.metadata.endGameScreen || ev.canceled)
            return;

        ev.cancel();

        if (ev.intentName === AmongUsEndGames.TasksComplete)
            return; // task completes are handled separately below

        const players = this.getEndgamePlayers();

        if (ev.intentName === AmongUsEndGames.O2Sabotage || ev.intentName === AmongUsEndGames.ReactorSabotage) {
            this.room.registerEndGameIntent(
                new EndGameIntent(
                    MouthwashEndGames.SystemSabotage,
                    GameOverReason.ImpostorBySabotage,
                    {
                        endGameScreen: new Map(players.map<[number, EndGameScreen]>(playerRole => {
                            return [
                                playerRole.player.playerId!,
                                {
                                    titleText: playerRole.metadata.alignment === RoleAlignment.Impostor ? "Victory" : Palette.impostorRed.text("Defeat"),
                                    subtitleText: `${Palette.impostorRed.text("Impostors")} won by sabotage`,
                                    backgroundColor: Palette.impostorRed,
                                    yourTeam: RoleAlignment.Impostor,
                                    winSound: WinSound.ImpostorWin,
                                    hasWon: playerRole.metadata.alignment === RoleAlignment.Impostor
                                }
                            ];
                        }))
                    }
                )
            );
        } else if (ev.intentName === AmongUsEndGames.PlayersDisconnect) {
            const metadata = ev.metadata as PlayersDisconnectEndgameMetadata;
            if (metadata.aliveImpostors === 0) {
                this.room.registerEndGameIntent(
                    new EndGameIntent(
                        MouthwashEndGames.ImpostorsDisconnected,
                        GameOverReason.ImpostorDisconnect,
                        {
                            endGameScreen: new Map(players.map<[number, EndGameScreen]>(playerRole => {
                                return [
                                    playerRole.player.playerId!,
                                    {
                                        titleText: playerRole.metadata.alignment === RoleAlignment.Impostor ? "Victory" : Palette.impostorRed.text("Defeat"),
                                        subtitleText: `${Palette.impostorRed.text("Impostors")} disconnected`,
                                        backgroundColor: Palette.crewmateBlue,
                                        yourTeam: RoleAlignment.Crewmate,
                                        winSound: WinSound.CrewmateWin,
                                        hasWon: playerRole.metadata.alignment !== RoleAlignment.Impostor
                                    }
                                ];
                            }))
                        }
                    )
                );
            } else {
                this.room.registerEndGameIntent(
                    new EndGameIntent(
                        MouthwashEndGames.CrewmatesDisconnected,
                        GameOverReason.HumansDisconnect,
                        {
                            endGameScreen: new Map(players.map<[number, EndGameScreen]>(playerRole => {
                                return [
                                    playerRole.player.playerId!,
                                    {
                                        titleText: playerRole.metadata.alignment === RoleAlignment.Impostor ? "Victory" : Palette.impostorRed.text("Defeat"),
                                        subtitleText: `${Palette.crewmateBlue.text("Crewmates")} disconnected`,
                                        backgroundColor: Palette.impostorRed,
                                        yourTeam: RoleAlignment.Impostor,
                                        winSound: WinSound.ImpostorWin,
                                        hasWon: playerRole.metadata.alignment === RoleAlignment.Impostor
                                    }
                                ];
                            }))
                        }
                    )
                );
            }
        } else if (ev.intentName === AmongUsEndGames.PlayersKill) {
            this.room.registerEndGameIntent(
                new EndGameIntent(
                    MouthwashEndGames.ImpostorsKilledCrewmates,
                    GameOverReason.ImpostorByKill,
                    {
                        endGameScreen: new Map(players.map<[number, EndGameScreen]>(playerRole => {
                            return [
                                playerRole.player.playerId!,
                                {
                                    titleText: playerRole.metadata.alignment === RoleAlignment.Impostor ? "Victory" : Palette.impostorRed.text("Defeat"),
                                    subtitleText: `The ${Palette.impostorRed.text("Impostors")} killed all of the ${Palette.crewmateBlue.text("Crewmates")}`,
                                    backgroundColor: Palette.impostorRed,
                                    yourTeam: RoleAlignment.Impostor,
                                    winSound: WinSound.ImpostorWin,
                                    hasWon: playerRole.metadata.alignment === RoleAlignment.Impostor
                                }
                            ];
                        }))
                    }
                )
            );
        } else if (ev.intentName === AmongUsEndGames.PlayersVoteOut) {
            const metadata = ev.metadata as PlayersVoteOutEndgameMetadata;
            const playerRole = this.roleService.getPlayerRole(metadata.exiled);
            if (playerRole && playerRole.metadata.alignment === RoleAlignment.Impostor) {
                this.room.registerEndGameIntent(
                    new EndGameIntent(
                        MouthwashEndGames.ImpostorVotedOut,
                        GameOverReason.HumansByVote,
                        {
                            endGameScreen: new Map(players.map<[number, EndGameScreen]>(playerRole => {
                                return [
                                    playerRole.player.playerId!,
                                    {
                                        titleText: playerRole.metadata.alignment === RoleAlignment.Crewmate ? "Victory" : Palette.impostorRed.text("Defeat"),
                                        subtitleText: `The ${Palette.crewmateBlue.text("Crewmates")} voted out the last ${Palette.impostorRed.text("Impostor")}`,
                                        backgroundColor: Palette.crewmateBlue,
                                        yourTeam: RoleAlignment.Crewmate,
                                        winSound: WinSound.CrewmateWin,
                                        hasWon: playerRole.metadata.alignment === RoleAlignment.Crewmate
                                    }
                                ];
                            }))
                        }
                    )
                );
            } else {
                this.room.registerEndGameIntent(
                    new EndGameIntent(
                        MouthwashEndGames.CrewmateVotedOut,
                        GameOverReason.ImpostorByVote,
                        {
                            endGameScreen: new Map(players.map<[number, EndGameScreen]>(playerRole => {
                                return [
                                    playerRole.player.playerId!,
                                    {
                                        titleText: playerRole.metadata.alignment === RoleAlignment.Impostor ? "Victory" : Palette.impostorRed.text("Defeat"),
                                        subtitleText: `The ${Palette.impostorRed.text("Impostors")} voted out the last ${Palette.crewmateBlue.text("Crewmate")}`,
                                        backgroundColor: Palette.impostorRed,
                                        yourTeam: RoleAlignment.Impostor,
                                        winSound: WinSound.ImpostorWin,
                                        hasWon: playerRole.metadata.alignment === RoleAlignment.Impostor
                                    }
                                ];
                            }))
                        }
                    )
                );
            }
        }
    }

    @EventListener("room.gameend")
    async onGameEnd(ev: RoomGameEndEvent) {
        const intent = ev.intent as EndGameIntent<{ endGameScreen: Map<number, EndGameScreen>|undefined }|undefined>|undefined;

        if (!intent)
            return;

        if (!intent.metadata?.endGameScreen)
            return;

        const rolePlayers: Record<RoleAlignment, number[]> = {
            [RoleAlignment.Crewmate]: [],
            [RoleAlignment.Neutral]: [],
            [RoleAlignment.Impostor]: [],
            [RoleAlignment.All]: []
        }

        for (const [ , player ] of this.room.players) {
            if (player.playerId === undefined)
                continue;

            const playerRole = this.roleService.getPlayerRole(player);
            if (!playerRole)
                continue;
            
            rolePlayers[RoleAlignment.All].push(player.playerId);
            if (playerRole.metadata.alignment === RoleAlignment.Crewmate) {
                rolePlayers[RoleAlignment.Crewmate].push(player.playerId);
            } else if (playerRole.metadata.alignment === RoleAlignment.Neutral) {
                rolePlayers[RoleAlignment.Neutral].push(player.playerId);
            } else if (playerRole.metadata.alignment === RoleAlignment.Impostor) {
                rolePlayers[RoleAlignment.Impostor].push(player.playerId);
            }
        }

        const endGameScreens: Map<PlayerData<Room>, EndGameScreen> = new Map;
        const promises = [];
        for (const [ , player ] of this.room.players) {
            if (player.playerId === undefined) {
                // do something if the player id is null
                continue;
            }
            
            const playerRole = this.roleService.getPlayerRole(player);
            const endGame = intent.metadata.endGameScreen.get(player.playerId);
            if (!endGame)
                continue;

            const connection = this.room.connections.get(player.clientId);
            if (!connection)
                return;

            endGameScreens.set(player, endGame);

            const yourTeam = typeof endGame.yourTeam === "undefined"
                ? playerRole ? rolePlayers[playerRole.metadata.alignment] : []
                : typeof endGame.yourTeam === "number"
                    ? rolePlayers[endGame.yourTeam]
                    : endGame.yourTeam
                        .reduce<number[]>((acc, player) => {
                            if (player.playerId !== undefined)
                                acc.push(player.playerId);
                            
                            return acc;
                        }, []);

            const customWinSoundAsset = typeof endGame.winSound === "number"
                ? undefined
                : endGame.winSound instanceof AssetReference
                    ? await this.assetLoader.resolveAssetReference(endGame.winSound)
                    : endGame.winSound;

            promises.push(
                connection.sendPacket(
                    new ReliablePacket(
                        connection.getNextNonce(),
                        [
                            new OverwriteGameOver(
                                endGame.titleText,
                                endGame.subtitleText,
                                endGame.backgroundColor,
                                yourTeam || [],
                                true,
                                true,
                                customWinSoundAsset !== undefined
                                    ? WinSound.CustomSound
                                    : customWinSoundAsset || WinSound.NoSound,
                                customWinSoundAsset
                                    ? customWinSoundAsset.assetId
                                    : 0
                            )
                        ]
                    )
                )
            );
        }
        await Promise.all(promises);
        await this.room.emit(new GamemodeGameEndEvent(this.room, endGameScreens));

        await Promise.all([
            this.hudService.resetAllHuds(),
            this.nameService.resetAllNames(),
            this.roleService.removeAllRoles()
        ]);
    }

    @EventListener("room.gameready")
    async onRoomGameReady(ev: RoomGameReadyEvent) {
        const roleAssignments = this.roleService.getRoleAssignments(this.gamemode?.getRoleCounts() || []);
        const ev2 = await this.room.emit(new GamemodeBeforeRolesAssignedEvent(roleAssignments));
        await this.roleService.assignAllRoles(ev2.alteredRolesAssigned);
    }

    @EventListener("mwgg.gamemode.rolesassigned")
    async onRolesAssigned(ev: GamemodeRolesAssignedEvent) {
        const { totalTasks, completeTasks, players, numPlayersWithTasks } = this.computeTaskCounts();
        await Promise.all(players.map(player => this.hudService.setTaskCounts(player, totalTasks, completeTasks, numPlayersWithTasks)));
    }

    computeTaskCounts(): { totalTasks: number; completeTasks: number; players: PlayerData<Room>[]; numPlayersWithTasks: number; } {
        let totalTasks = 0;
        let completeTasks = 0;
        let numPlayersWithTasks = 0;
        const players = [];
        for (const [ , player ] of this.room.players) {
            const playerInfo = player.playerInfo;
            if (playerInfo && !playerInfo.isDisconnected && this.hudService.getPlayerHud(player).allowTaskInteraction) {
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

    @EventListener("player.completetask")
    async onPlayerCompleteTask(ev: PlayerCompleteTaskEvent<Room>) {
        const { totalTasks, completeTasks, players, numPlayersWithTasks } = this.computeTaskCounts();
        await Promise.all(players.map(player => this.hudService.setTaskCounts(player, totalTasks, completeTasks, numPlayersWithTasks)));

        if (totalTasks > 0 && completeTasks >= totalTasks) {
            const players = this.getEndgamePlayers();
            this.room.registerEndGameIntent(
                new EndGameIntent(
                    MouthwashEndGames.CrewmatesCompletedTasks,
                    GameOverReason.HumansByTask,
                    {
                        endGameScreen: new Map(players.map<[number, EndGameScreen]>(playerRole => {
                            return [
                                playerRole.player.playerId!,
                                {
                                    titleText: playerRole.metadata.alignment === RoleAlignment.Crewmate ? "Victory" : Palette.impostorRed.text("Defeat"),
                                    subtitleText: `The ${Palette.crewmateBlue.text("Crewmates")} completed all of the tasks`,
                                    backgroundColor: Palette.crewmateBlue,
                                    winSound: WinSound.CrewmateWin,
                                    hasWon: playerRole.metadata.alignment === RoleAlignment.Crewmate
                                }
                            ];
                        }))
                    }
                )
            );
        }
    }

    @EventListener("player.murder")
    async onPlayerMurder(ev: PlayerMurderEvent<Room>) {
        await this.deadBodyService.spawnDeadBody(ev.victim);
    }

    @EventListener("player.die")
    async onPlayerDie(ev: PlayerDieEvent<Room>) {
        const playerHud = this.hudService.getPlayerHud(ev.player);
        const cachedTaskText = playerHud.hudStrings.get(HudLocation.TaskText);
        const taskText = cachedTaskText || [];
        if (!cachedTaskText) {
            playerHud.hudStrings.set(HudLocation.TaskText, taskText);
        }
        
        const youDied = Palette.impostorRed.text("You're dead");

        const fakeTasksIdx = taskText.findIndex(([ key ]) => key === "fake-tasks");
        if (fakeTasksIdx > -1) {
            taskText.splice(fakeTasksIdx, 0, ["you-died-text", youDied, 999]);
        } else {
            taskText.push(["you-died-text", youDied, 999]);
        }

        this.hudService.updateHudString(HudLocation.TaskText, ev.player, playerHud);
    }

    @EventListener("player.startmeeting")
    async onStartMeeting(ev: PlayerStartMeetingEvent<Room>) {
        const promises = [];
        for (const [ , deadBody ] of this.deadBodyService.deadBodies) {
            promises.push(deadBody.destroy("meeting"));
        }
        await Promise.all(promises);
    }

    @EventListener("mwgg.deadbody.report")
    async onReportDeadBody(ev: DeadBodyReportEvent) {
        const playerBody = this.room.getPlayerByPlayerId(ev.deadBody.playerId);
        if (!playerBody) {
            this.logger.warn("Got report for a dead body without a player (body netId=%s, playerId=%s)", ev.deadBody.netId, ev.deadBody.playerId);
            return;
        }

        await this.room.getActingHosts()[0]?.control?.startMeeting(ev.reporterPlayer, playerBody);
    }
}