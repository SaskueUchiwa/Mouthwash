import * as crypto from "crypto";

import {
    Connection,
    HindenburgPlugin,
    MessageHandler,
    MessageHandlerCallback,
    PacketContext,
    PlayerData,
    Room,
    RoomGameEndEvent,
    RoomPlugin,
    RpcMessage,
    SpawnType,
    SyncSettingsMessage,
    EventListener,
    RoomDestroyEvent,
    BaseRpcMessage,
    CastVoteMessage,
    CheckColorMessage,
    CheckNameMessage,
    ClimbLadderMessage,
    CloseDoorsOfTypeMessage,
    CompleteTaskMessage,
    EnterVentMessage,
    ExitVentMessage,
    MurderPlayerMessage,
    RepairSystemMessage,
    SendChatMessage,
    SetHatMessage,
    RpcMessageTag,
    SendQuickChatMessage,
    SetPetMessage,
    SetScanner,
    SetStartCounterMessage,
    UpdateSystemMessage,
    UsePlatformMessage,
    Color,
    Networkable,
    PlayerControl,
    PlayerPhysics,
    CustomNetworkTransform,
    SetSkinMessage,
    Pet,
    Hat,
    Skin,
    SnapToMessage,
    ReportDeadBodyMessage as AmongUsReportDeadBodyMessage,
    InnerShipStatus,
    SpawnMessage,
    DespawnMessage,
    SceneChangeMessage,
    ReadyMessage,
    DataMessage,
    HazelReader,
    MeetingHud,
    GameState,
    MessageHandlerAttach
} from "@skeldjs/hindenburg";

import { BaseRole, Crewmate, Impostor, MouthwashApiPlugin, RoleCtr } from "hbplugin-mouthwashgg-api";
import { MouthwashggMetricsPlugin } from "hbplugin-mouthwashgg-metrics";

import {
    CameraController,
    ClickBehaviour,
    ClickMessage,
    DeadBody,
    MouthwashRpcMessageTag,
    MouthwashSpawnType,
    ReportDeadBodyMessage
} from "mouthwash-types";

import { CollidersService } from "./Colliders";
import { InfractionName } from "./enums";
import { MouthwashAuthPlugin } from "hbplugin-mouthwashgg-auth";
import { getAnticheatExceptions } from "./hooks";

import { ChatModule, MeetingModule, RepairModule, TaskModule, VentModule } from "./modules";

export enum InfractionSeverity {
    /**
     * Shouldn't happen in perfect gameplay but could very well happen under medium-high
     * ping.
     */
    Low = "LOW",
    /**
     * Could easily happen with higher ping, or could be the result of client-server
     * desync and has little to no significant impact on gameplay. Alternatively, important
     * side information that could be used alongside other infraction logs to determine
     * if a player is cheating.
     */
    Medium = "MEDIUM",
    /**
     * Could theoretically happen with high ping but never with low ping, or is a
     * cheat that should be impossible but doesn't have any significant impact on gameplay.
     */
    High = "HIGH",
    /**
     * Should _never_ happen even with extremely high ping and has a major
     * impact on gameplay.
     */
    Critical = "CRITICAL"
}

export interface PlayerInfraction {
    userId: string|null;
    gameId: string|null;
    createdAt: Date;
    playerPing: number;
    infractionName: string;
    additionalDetails: any;
    severity: InfractionSeverity;
}

const impostorExceptions = new Set([ InfractionName.ForbiddenRpcSabotage, InfractionName.ForbiddenRpcVent, InfractionName.ForbiddenRpcCloseDoors ]);
const crewmateExceptions = new Set([ InfractionName.ForbiddenRpcRepair, InfractionName.ForbiddenRpcCompleteTask ]);

const allowedShipStatusRpcMessages = new Set([ RpcMessageTag.CloseDoorsOfType, RpcMessageTag.UpdateSystem, RpcMessageTag.RepairSystem ]);
const allowedMeetingHudRpcMessages = new Set([ RpcMessageTag.CastVote ]);

@HindenburgPlugin("hbplugin-mouthwashgg-anti-cheat", "1.0.0", "last")
export class MouthwashAntiCheatPlugin extends RoomPlugin {
    collidersService: CollidersService;
    api!: MouthwashApiPlugin;
    authApi: MouthwashAuthPlugin;

    metrics?: MouthwashggMetricsPlugin;
    unflushedPlayerInfractions: PlayerInfraction[];

    ventModule: VentModule;
    meetingModule: MeetingModule;
    chatModule: ChatModule;
    repairModule: RepairModule;
    taskModule: TaskModule;

    constructor(
        public readonly room: Room,
        public readonly config: any
    ) {
        super(room, config);

        this.collidersService = new CollidersService(this);
        this.metrics = this.getDependencyUnsafe("hbplugin-mouthwashgg-metrics", "worker") as MouthwashggMetricsPlugin|undefined;
        this.authApi = this.assertDependency("hbplugin-mouthwashgg-auth", "worker") as MouthwashAuthPlugin;
        this.api = this.assertDependency("hbplugin-mouthwashgg-api", "room") as MouthwashApiPlugin;

        this.unflushedPlayerInfractions = [];
        
        this.ventModule = new VentModule(this);
        this.meetingModule = new MeetingModule(this);
        this.chatModule = new ChatModule(this);
        this.repairModule = new RepairModule(this);
        this.taskModule = new TaskModule(this);
    }

    async onPluginLoad() {
        await this.collidersService.loadAllColliders();
        this.room.registerEventTarget(this.ventModule);
        this.room.registerEventTarget(this.meetingModule);
        this.room.registerEventTarget(this.repairModule);
        this.room.registerEventTarget(this.taskModule);
        this.logger.info("Loaded colliders for maps");
    }

    async onPluginUnload() {
        this.room.removeEventTarget(this.ventModule);
        this.room.removeEventTarget(this.meetingModule);
        this.room.removeEventTarget(this.repairModule);
        this.room.removeEventTarget(this.taskModule);
    }

    // async banPlayer(player: PlayerData<Room>|Connection, role: BaseRole|undefined, reason: AnticheatReason) {
    //     const connection = player instanceof Connection ? player : this.room.connections.get(player.clientId);
    //     if (!connection) return;

    //     this.room.bannedAddresses.add(connection.remoteInfo.address);
    //     if (!role) {
    //         this.logger.info("Banned %s for reason '%s'",
    //             player, reason);
    //     } else {
    //         this.logger.info("Banned %s for reason '%s' (role %s, %s)",
    //             player, reason, role.metadata.roleName, RoleAlignment[role.metadata.alignment]);
    //     }
    //     connection.disconnect(DisconnectReason.Banned);
    // }

    async flushPlayerInfractions() {
        const lobbyId = this.metrics?.lobbyIds.get(this.room);
        if (this.unflushedPlayerInfractions.length === 0) {
            this.logger.info("No infractions to flush");
            return;
        }

        if (this.metrics === undefined) {
            this.logger.warn("No metrics plugin to flush infractions to, please ensure that the plugin is loaded alongside this one");
            return;
        }

        const params = [];
        for (const playerInfraction of this.unflushedPlayerInfractions) {
            params.push(crypto.randomUUID(), playerInfraction.userId, lobbyId || null, playerInfraction.gameId, playerInfraction.createdAt,
                playerInfraction.playerPing, playerInfraction.infractionName, playerInfraction.additionalDetails, playerInfraction.severity);
        }
        const { rows: addedInfractions } = await this.metrics?.postgresClient.query(`
            INSERT INTO player_infraction(id, user_id, lobby_id, game_id, created_at, player_ping, infraction_name, additional_details, severity)
            VALUES ${this.unflushedPlayerInfractions.map((_uploadLobbiesInterval, i) =>
                `($${(i * 9) + 1}, $${(i * 9) + 2}, $${(i * 9) + 3}, $${(i * 9) + 4}, $${(i * 9) + 5}, $${(i * 9) + 6}, $${(i * 9) + 7}, $${(i * 9) + 8}, $${(i * 9) + 9})`)
                .join(",")}
            RETURNING *
        `, params);
        this.logger.info("Flushed %s/%s infractions", addedInfractions.length, this.unflushedPlayerInfractions.length);
        this.unflushedPlayerInfractions = [];
    }

    getInfractions<T extends BaseRole>(role: T) {
        if (role.constructor === Impostor) {
            return impostorExceptions;
        } else if (role.constructor === Crewmate) {
            return crewmateExceptions;
        }
        
        return getAnticheatExceptions(role["constructor"] as RoleCtr);
    }

    async createInfraction(playerOrConnection: PlayerData<Room>|Connection, infractionName: InfractionName, additionalDetails: any, severity: InfractionSeverity) {
        const gameId = this.metrics?.lobbyCurrentGameIds.get(this.room);
        const connection = playerOrConnection instanceof Connection ? playerOrConnection : this.room.getConnection(playerOrConnection);
        const player = playerOrConnection instanceof PlayerData ? playerOrConnection : playerOrConnection.getPlayer();
        if (!connection) {
            this.logger.warn("Tried to log infraction %s (%s) for %s, but they didn't have a connection on the server",
                infractionName, severity, player);
            return;
        }
        if (!player) {
            this.logger.warn("Tried to log infraction %s (%s) for %s, but they didn't have a player in the room",
                infractionName, severity, player);
            return;
        }
        const playerRole = this.api.roleService.getPlayerRole(player);
        if (playerRole !== undefined) {
            const exceptions = this.getInfractions(playerRole);
            if (exceptions.has(infractionName))
                return;
        }

        const connectionUser = await this.authApi.getConnectionUser(connection);
        if (!connectionUser) {
            this.logger.warn("Tried to log infraction %s (%s) for %s, but they don't appear to be logged in",
                infractionName, severity, player);
            return;
        }

        const infraction: PlayerInfraction = {
            userId: connectionUser.id,
            gameId: gameId || null,
            createdAt: new Date,
            playerPing: connection.roundTripPing,
            infractionName,
            additionalDetails,
            severity
        };

        this.unflushedPlayerInfractions.push(infraction);

        if (severity !== "LOW") {
            this.logger.warn("Player %s violated infraction rule %s (%s unflushed infraction%s)",
                player, infractionName, this.unflushedPlayerInfractions.length, this.unflushedPlayerInfractions.length === 1 ? "" : "s");
            return infraction;
        }

        if (this.unflushedPlayerInfractions.length > 100) {
            this.flushPlayerInfractions();
        }
        
        return infraction;
    }

    async validateRpcUsage(component: Networkable, rpcMessage: BaseRpcMessage, sender: Connection) {
        switch (rpcMessage.messageTag as number) {
            case RpcMessageTag.AddVote:
                if (this.room.voteBanSystem === component) return;
                break;
            case RpcMessageTag.CastVote:
            case RpcMessageTag.ClearVote:
            case RpcMessageTag.Close:
            case RpcMessageTag.VotingComplete:
                if (this.room.meetingHud === component) return;
                break;
            case RpcMessageTag.CheckColor:
            case RpcMessageTag.CheckName:
            case RpcMessageTag.CompleteTask:
            case RpcMessageTag.Exiled:
            case RpcMessageTag.MurderPlayer:
            case RpcMessageTag.PlayAnimation:
            case RpcMessageTag.ReportDeadBody:
            case RpcMessageTag.SendChat:
            case RpcMessageTag.SendChatNote:
            case RpcMessageTag.SendQuickChat:
            case RpcMessageTag.SetColor:
            case RpcMessageTag.SetHat:
            case RpcMessageTag.SetInfected:
            case RpcMessageTag.SetName:
            case RpcMessageTag.SetPet:
            case RpcMessageTag.SetScanner:
            case RpcMessageTag.SetSkin:
            case RpcMessageTag.SetStartCounter:
            case RpcMessageTag.SetTasks:
            case RpcMessageTag.StartMeeting:
            case RpcMessageTag.SyncSettings:
            case RpcMessageTag.UsePlatform:
            case MouthwashRpcMessageTag.SetOpacity:
            case MouthwashRpcMessageTag.SetOutline:
            case MouthwashRpcMessageTag.SetPlayerSpeedModifier:
            case MouthwashRpcMessageTag.SetPlayerVisionModifier:
            case MouthwashRpcMessageTag.BeginPlayerAnimation:
                if (component instanceof PlayerControl) return;
                break;
            case RpcMessageTag.ClimbLadder:
            case RpcMessageTag.EnterVent:
            case RpcMessageTag.ExitVent:
                if (component instanceof PlayerPhysics) return;
                break;
            case RpcMessageTag.SnapTo:
                if (component instanceof CustomNetworkTransform) return;
                break;
            case RpcMessageTag.RepairSystem:
            case RpcMessageTag.CloseDoorsOfType:
            case RpcMessageTag.UpdateSystem:
                if (this.room.shipStatus === component) return;
                break;
            case MouthwashRpcMessageTag.SetChatVisibility:
            case MouthwashRpcMessageTag.CloseHud:
            if (this.room.gameData === component) return;
                break;
            case MouthwashRpcMessageTag.BeginCameraAnimation:
                if (component instanceof CameraController) return;
                break;
            case MouthwashRpcMessageTag.SetCountingDown:
            case MouthwashRpcMessageTag.Click:
                if (component instanceof ClickBehaviour) return;
                break;
            case MouthwashRpcMessageTag.ReportDeadBody:
                if (component instanceof DeadBody) return;
                break;
        }
        
        rpcMessage.cancel();
        return this.createInfraction(sender, InfractionName.ForbiddenRpcCode, { netId: component.netId, rpcId: rpcMessage.messageTag, spawnType: component.spawnType }, InfractionSeverity.Critical);
    }

    async onRpcMessageData(component: Networkable, rpcMessage: BaseRpcMessage, sender: Connection) {
        if (!(rpcMessage.messageTag in RpcMessageTag) && !(rpcMessage.messageTag in MouthwashRpcMessageTag))
            return this.createInfraction(sender, InfractionName.InvalidRpcCode, { netId: component.netId, rpcId: rpcMessage.messageTag }, InfractionSeverity.High);

        const usageInfraction = await this.validateRpcUsage(component, rpcMessage, sender);
        if (usageInfraction)
            return usageInfraction;

        switch (rpcMessage.messageTag) {
        case RpcMessageTag.AddVote:
            // TODO: used for votebansystem - do we even have this?
            // const addVoteMessage = rpcMessage as AddVoteMessage;
            // return this.createInfraction(sender, InfractionName.InvalidRpcColor, { rpcId: RpcMessageTag.AddVote }, InfractionSeverity.Critical);
        case RpcMessageTag.CastVote:
            const castVoteInfraction = await this.meetingModule.onCastVoteMessage(sender, rpcMessage as CastVoteMessage);
            if (castVoteInfraction)
                return castVoteInfraction;
            break;
        case RpcMessageTag.CheckColor:
            const checkColorMessage = rpcMessage as CheckColorMessage;
            if (!(checkColorMessage.color in Color)) {
                rpcMessage.cancel();
                return this.createInfraction(sender, InfractionName.InvalidRpcColor,
                    { colorId: checkColorMessage.color },  InfractionSeverity.Critical);
            }
            break;
        case RpcMessageTag.CheckName:
            const checkNameMessage = rpcMessage as CheckNameMessage;
            const checkNameConnectionUser = await this.authApi.getConnectionUser(sender);
            if (!checkNameConnectionUser) return;
            if (checkNameMessage.name !== checkNameConnectionUser.display_name) {
                rpcMessage.cancel();
                return this.createInfraction(sender, InfractionName.InvalidRpcName,
                    { name: checkNameMessage.name },  InfractionSeverity.Critical);
            }
            break;
        case RpcMessageTag.ClearVote:
        case RpcMessageTag.Close:
        case RpcMessageTag.Exiled:
        case RpcMessageTag.MurderPlayer:
        case RpcMessageTag.PlayAnimation:
        case RpcMessageTag.SetInfected:
        case RpcMessageTag.SetTasks:
        case RpcMessageTag.SetName:
        case RpcMessageTag.SetColor:
        case RpcMessageTag.StartMeeting:
        case RpcMessageTag.SyncSettings:
        case RpcMessageTag.VotingComplete:
        case RpcMessageTag.BootFromVent:
        case RpcMessageTag.SendChatNote:
        case MouthwashRpcMessageTag.SetOpacity:
        case MouthwashRpcMessageTag.SetOutline:
        case MouthwashRpcMessageTag.SetPlayerSpeedModifier:
        case MouthwashRpcMessageTag.SetPlayerVisionModifier:
        case MouthwashRpcMessageTag.BeginPlayerAnimation:
        case MouthwashRpcMessageTag.SetChatVisibility:
        case MouthwashRpcMessageTag.CloseHud:
        case MouthwashRpcMessageTag.BeginCameraAnimation:
            rpcMessage.cancel();
            return this.createInfraction(sender, InfractionName.ForbiddenRpcCode, { netId: component.netId, rpcId: rpcMessage.messageTag, spawnType: component.spawnType }, InfractionSeverity.Critical);
        case RpcMessageTag.ReportDeadBody:
            const amongUsReportDeadBodyInfraction = await this.meetingModule.onAmongUsReportDeadBody(sender, rpcMessage as AmongUsReportDeadBodyMessage);
            if (amongUsReportDeadBodyInfraction)
                return amongUsReportDeadBodyInfraction;
            break;
        case RpcMessageTag.ClimbLadder:
            const climbLadderMessage = rpcMessage as ClimbLadderMessage;
            break;
        case RpcMessageTag.CloseDoorsOfType:
            const closeDoorsOfTypeMessage = await this.repairModule.onCloseDoorsOfType(sender, rpcMessage as CloseDoorsOfTypeMessage);
            if (closeDoorsOfTypeMessage)
                return closeDoorsOfTypeMessage;
            break;
        case RpcMessageTag.CompleteTask:
            const completeTaskInfraction = await this.taskModule.onCompleteTask(sender, rpcMessage as CompleteTaskMessage);
            if (completeTaskInfraction)
                return completeTaskInfraction;
            break;
        case RpcMessageTag.EnterVent:
            const enterVentInfraction = await this.ventModule.onEnterVent(sender, rpcMessage as EnterVentMessage);
            if (enterVentInfraction)
                return enterVentInfraction;
            break;
        case RpcMessageTag.ExitVent:
            const exitVentInfraction = await this.ventModule.onExitVent(sender, rpcMessage as ExitVentMessage);
            if (exitVentInfraction)
                return exitVentInfraction;
            break;
        case RpcMessageTag.MurderPlayer: // Murders are replaced by button presses
            const murderPlayerMessage = rpcMessage as MurderPlayerMessage;
        case RpcMessageTag.RepairSystem:
            const repairSystemInfraction = await this.repairModule.onRepairSystem(sender, rpcMessage as RepairSystemMessage);
            if (repairSystemInfraction)
                return repairSystemInfraction;
            break;
        case RpcMessageTag.SendChat:
            const sendChatInfraction = await this.chatModule.onChatMessage(sender, rpcMessage as SendChatMessage);
            if (sendChatInfraction)
                return sendChatInfraction;
            break;
        case RpcMessageTag.SendQuickChat:
            const sendQuickChatMessage = rpcMessage as SendQuickChatMessage;
            break;
        case RpcMessageTag.SetHat:
            const setHatMessage = rpcMessage as SetHatMessage;
            if (setHatMessage.hatId === Hat.NoHat) return;
            const setHatConnectionUser = await this.authApi.getConnectionUser(sender);
            if (setHatConnectionUser) {
                if (!(setHatMessage.hatId in Hat) && setHatConnectionUser.owned_cosmetics.findIndex(cosmetic => cosmetic.among_us_id === setHatMessage.hatId && cosmetic.type === "HAT") === -1) {
                    setHatMessage.cancel();
                    return this.createInfraction(sender, InfractionName.InvalidRpcHat, { hatId: setHatMessage.hatId }, InfractionSeverity.Critical);
                }
            }
        case RpcMessageTag.SetPet:
            const setPetMessage = rpcMessage as SetPetMessage;
            if (setPetMessage.petId === Pet.EmptyPet) return;
            const setPetConnectionUser = await this.authApi.getConnectionUser(sender);
            if (!setPetConnectionUser) return;
            if (setPetConnectionUser) {
                if (!(setPetMessage.petId in Pet) && setPetConnectionUser.owned_cosmetics.findIndex(cosmetic => cosmetic.among_us_id === setPetMessage.petId && cosmetic.type === "PET") === -1) {
                    setPetMessage.cancel();
                    return this.createInfraction(sender, InfractionName.InvalidRpcPet, { petId: setPetMessage.petId }, InfractionSeverity.Critical);
                }
            }
        case RpcMessageTag.SetSkin:
            const setSkinMessage = rpcMessage as SetSkinMessage;
            if (setSkinMessage.skinId === Skin.MilitarySnowskin) return;
            if (!(setSkinMessage.skinId in Skin)) {
                setSkinMessage.cancel();
                return this.createInfraction(sender, InfractionName.InvalidRpcSkin, { skinId: setSkinMessage.skinId }, InfractionSeverity.Critical);
            }
        case RpcMessageTag.SetScanner:
            const setScannerMessage = rpcMessage as SetScanner;
            break;
        case RpcMessageTag.SetStartCounter:
            const setStartCounterMessage = rpcMessage as SetStartCounterMessage;
            if (!this.room.actingHostIds.has(sender.clientId) && setStartCounterMessage.counter !== -1) {
                return this.createInfraction(sender, InfractionName.ForbiddenRpcCode, { netId: component.netId, rpcId: rpcMessage.messageTag, spawnType: component.spawnType }, InfractionSeverity.Critical);
            }
            break;
        case RpcMessageTag.SnapTo:
            const snapToInfraction = await this.ventModule.onSnapTo(sender, rpcMessage as SnapToMessage);
            if (snapToInfraction)
                return snapToInfraction;
            break;
        case RpcMessageTag.UpdateSystem:
            const updateSystemMessage = rpcMessage as UpdateSystemMessage;
            break;
        case RpcMessageTag.UsePlatform:
            const usePlatformMessage = rpcMessage as UsePlatformMessage;
            break;
        case MouthwashRpcMessageTag.Click:
            const clickMessage = rpcMessage as ClickMessage;
            break;
        case MouthwashRpcMessageTag.SetCountingDown:
            const setCountingDownMessage = rpcMessage;
            break;
        case MouthwashRpcMessageTag.ReportDeadBody:
            const reportDeadBodyInfraction = await this.meetingModule.onReportDeadBody(sender, component as DeadBody, rpcMessage as ReportDeadBodyMessage);
            if (reportDeadBodyInfraction)
                return reportDeadBodyInfraction;
            break;
        default:
            return this.createInfraction(sender, InfractionName.InvalidRpcCode, { netId: component.netId, rpcId: rpcMessage.messageTag }, InfractionSeverity.High);
        }
    }

    async verifyComponentOwnership(component: Networkable<Room>, sender: Connection) {
        if (component.ownerId === -1 || component.ownerId !== sender.clientId) {
            // dead bodies and buttons are done via their network id, rather than the playercontrol.
            if (component.spawnType === MouthwashSpawnType.Button as number) {
                const button = this.api.hudService.buttonsByNetId.get(component.netId);
                if (button && button.player.clientId === sender.clientId) {
                    return true;
                }
            } else if (component.spawnType === MouthwashSpawnType.DeadBody as number) {
                return true;
            }
            return false;
        }
        return true;
    }

    @MessageHandler(DataMessage, { override: true, attachTo: MessageHandlerAttach.Room })
    async onDataMessage(message: DataMessage, context: PacketContext, originalHandlers: MessageHandlerCallback<DataMessage>[]) {
        if (message.netId === this.room.gameData?.netId && this.config.serverAsHost && context.sender?.clientId === this.room.host?.clientId)
            return;

        const component = this.room.netobjects.get(message.netId);
        if (component) {
            if (component === this.room.gameData && !this.room["finishedActingHostTransactionRoutine"]) {
                // it's necessary for the client to do some things for the SaaH acting host transaction.
                // to combat potential fraud at this stage, we can just ignore any changes to gamedata.
                message.cancel();
                return;
            }

            if (context.sender) {
                if (!await this.verifyComponentOwnership(component, context.sender)) {
                    message.cancel();
                    return await this.createInfraction(context.sender, InfractionName.ForbiddenDataInnernetObject,
                        { netId: message.netId, spawnType: component.spawnType }, InfractionSeverity.Critical);
                }
                if (!(component instanceof CustomNetworkTransform)) {
                    message.cancel();
                    return await this.createInfraction(context.sender, InfractionName.InvalidDataInnernetObject,
                        { netId: message.netId, spawnType: component.spawnType }, InfractionSeverity.Critical);
                }
            }

            const reader = HazelReader.from(message.data);
            component.Deserialize(reader);
        } else {
            if (context.sender) {
                // todo: actually check why clients send a Data message at the end of a game
                if (this.room.gameState !== GameState.Ended) {
                    message.cancel();
                    return await this.createInfraction(context.sender, InfractionName.UnknownDataInnernetObject,
                        { netId: message.netId }, InfractionSeverity.Critical);
                }
            }
        }
    }

    @MessageHandler(RpcMessage, { override: true, attachTo: MessageHandlerAttach.Room })
    async onRpcMessage(message: RpcMessage, context: PacketContext, originalHandlers: MessageHandlerCallback<RpcMessage>[]) {
        if (this.room.host && this.room.host.clientId === context.sender?.clientId && !this.room["finishedActingHostTransactionRoutine"] && message.data instanceof SyncSettingsMessage) {
            this.logger.info("Got initial settings, acting host handshake complete");
            this.room["finishedActingHostTransactionRoutine"] = true;
            this.room.settings.patch(message.data.settings);
            return;
        }

        const component = this.room.netobjects.get(message.netId);
        if (component) {
            if (context.sender) {
                if (!await this.verifyComponentOwnership(component, context.sender)) {
                    if ((!(component instanceof InnerShipStatus) || !allowedShipStatusRpcMessages.has(message.data.messageTag))
                        && (!(component instanceof MeetingHud) || !allowedMeetingHudRpcMessages.has(message.data.messageTag))) {
                        message.cancel();
                        return await this.createInfraction(context.sender, InfractionName.ForbiddenRpcInnernetObject,
                                { netId: message.netId, rpcId: message.data.messageTag, spawnType: component.spawnType }, InfractionSeverity.Critical);
                    }
                }
                const infraction = await this.onRpcMessageData(component, message.data, context.sender);
                if (infraction && infraction.severity === InfractionSeverity.Critical) {
                    message.cancel();
                    return;
                }
            }

            try {
                await component.HandleRpc(message.data);
            } catch (e) {
                this.logger.error("Could not process remote procedure call from client %s (net id %s, %s): %s",
                    context.sender, component.netId, SpawnType[component.spawnType] || "Unknown", e);
            }
        } else {
            if (this.room.gameState !== GameState.Ended || message.data.messageTag !== RpcMessageTag.SetScanner) {
                if (context.sender) {
                    await this.createInfraction(context.sender, InfractionName.UnknownRpcInnernetObject, { netId: message.netId, rpcId: message.data.messageTag }, InfractionSeverity.Medium);
                }
                this.logger.warn("Got remote procedure call for non-existent component from %s: net id %s. There is a chance that a player is using this to communicate discreetly with another player",
                    context.sender, message.netId);
            }
        }
    }

    @MessageHandler(SpawnMessage, { override: true, attachTo: MessageHandlerAttach.Room })
    async onSpawnMessage(message: SpawnMessage, context: PacketContext, originalHandlers: MessageHandlerCallback<SpawnMessage>[]) {
        if (context.sender) {
            const defaultInfraction = await this.createInfraction(context.sender, InfractionName.ForbiddenSpawn,
                { spawnType: message.spawnType, ownerId: message.ownerid }, InfractionSeverity.Critical);
            if (defaultInfraction) {
                message.cancel();
                return;
            }
        }

        for (const originalHandler of originalHandlers) {
            await originalHandler(message, context);
        }
    }

    @MessageHandler(DespawnMessage, { override: true, attachTo: MessageHandlerAttach.Room }) 
    async onDespawnMessage(message: DespawnMessage, context: PacketContext, originalHandlers: MessageHandlerCallback<DespawnMessage>[]) {
        if (context.sender) {
            const component = this.room.netobjects.get(message.netId);
            // components don't exist server-side at game end
            if (this.room.gameState === GameState.Ended && (!component || component.ownerId === context.sender.clientId))
                return;

            if (!component || component.ownerId !== context.sender.clientId) {
                const defaultInfraction = await this.createInfraction(context.sender, InfractionName.ForbiddenDespawn,
                    { netId: message.netId }, InfractionSeverity.Critical);
                if (defaultInfraction) {
                    message.cancel();
                    return;
                }
            }
        }

        for (const originalHandler of originalHandlers) {
            await originalHandler(message, context);
        }
    }

    @MessageHandler(SceneChangeMessage, { override: true, attachTo: MessageHandlerAttach.Room })
    async onSceneChangeMessage(message: SceneChangeMessage, context: PacketContext, originalHandlers: MessageHandlerCallback<SceneChangeMessage>[]) {
        if (context.sender) {
            if (message.clientId !== context.sender.clientId)
                return await this.createInfraction(context.sender, InfractionName.FalseSceneChange,
                    { clientId: message.clientId, sceneName: message.scene }, InfractionSeverity.Critical);
    
            if (message.scene !== "OnlineGame" && (message.scene !== "EndGame" || this.room.gameState !== GameState.Ended)) {
                message.cancel();
                return await this.createInfraction(context.sender, InfractionName.InvalidSceneChange,
                    { sceneName: message.scene }, InfractionSeverity.Critical);
            }

            const player = this.room.players.get(message.clientId);
            if (!player) {
                message.cancel();
                return await this.createInfraction(context.sender, InfractionName.ForbiddenSceneChange,
                    { sceneName: message.scene }, InfractionSeverity.Critical);
            }

            if (player.inScene && message.scene !== "EndGame") {
                return await this.createInfraction(context.sender, InfractionName.DuplicateSceneChange,
                    { sceneName: message.scene }, InfractionSeverity.High);
            }
        }
        
        for (const originalHandler of originalHandlers) {
            await originalHandler(message, context);
        }
    }

    @MessageHandler(ReadyMessage, { override: true, attachTo: MessageHandlerAttach.Room })
    async onReadyMessage(message: ReadyMessage, context: PacketContext, originalHandlers: MessageHandlerCallback<ReadyMessage>[]) {
        if (context.sender) {
            if (message.clientId !== context.sender.clientId) {
                message.cancel();
                return await this.createInfraction(context.sender, InfractionName.FalseReady,
                    { clientId: message.clientId }, InfractionSeverity.Critical);
            }

            const player = this.room.players.get(message.clientId);
            if (!player) {
                return await this.createInfraction(context.sender, InfractionName.InvalidReady,
                    { clientId: message.clientId }, InfractionSeverity.High);
            }
            if (player.isReady) {
                return await this.createInfraction(context.sender, InfractionName.InvalidReady,
                    { clientId: message.clientId, isReady: true }, InfractionSeverity.High);
            }
        }

        for (const originalHandler of originalHandlers) {
            await originalHandler(message, context);
        }
    }

    @EventListener("room.gameend")
    async onRoomGameEnd(ev: RoomGameEndEvent) {
        await this.flushPlayerInfractions();
    }

    @EventListener("room.destroy")
    async onRoomDestroy(ev: RoomDestroyEvent) {
        await this.flushPlayerInfractions();
    }
}