import {
    AirshipVents,
    Connection,
    EnterVentMessage,
    EventListener,
    EventTarget,
    ExitVentMessage,
    GameMap,
    MeetingHudVotingCompleteEvent,
    MiraHQVents,
    PolusVents,
    RoomGameStartEvent,
    SnapToMessage,
    TheSkeldVents,
    Vector2
} from "@skeldjs/hindenburg";

import { InfractionSeverity, MouthwashAntiCheatPlugin } from "../plugin";
import { InfractionName } from "../enums";

interface VentDataModel {
    id: number;
    position: {
        x: number;
        y: number;
    };
    network: number[];
}

const allowedAirshipLocations = [
    new Vector2(-7, -11.5),
    new Vector2(15.5, 0),
    new Vector2(-0.7, -1),
    new Vector2(33.5, -1.5),
    new Vector2(20, 10.5),
    new Vector2(-0.7, 8.5),
    new Vector2(-25, 40) // intial non-map location for pending spawn on Airship
];

export class VentModule extends EventTarget {
    protected lastRoundStartedAt: number;
    protected roundIdIdx: number;

    constructor(public readonly plugin: MouthwashAntiCheatPlugin) {
        super();
        
        this.lastRoundStartedAt = 0;
        this.roundIdIdx = 0;
    }

    getVentsInMap(): Record<number, VentDataModel>|undefined {
        const map = this.plugin.room.settings.map;
        switch (map) {
            case GameMap.TheSkeld:
            case GameMap.AprilFoolsTheSkeld:
                return TheSkeldVents;
            case GameMap.MiraHQ:
                return MiraHQVents;
            case GameMap.Polus:
                return PolusVents;
            case GameMap.Airship:
                return AirshipVents;
        }
    }

    getVentById(ventId: number) {
        const mapVents = this.getVentsInMap();
        if (!mapVents) return undefined;

        return ventId === -1 ? undefined : mapVents[ventId];
    }

    getPlayerVent(sender: Connection) {
        const player = sender.getPlayer();
        if (!player) return undefined;
        const playerPhysics = player.physics;
        if (!playerPhysics) return undefined;

        return this.getVentById(playerPhysics.ventId);
    }

    protected _getFullVentNetwork(vent: VentDataModel, mapVents: Record<number, VentDataModel>, allVents: Set<VentDataModel>) {
        if (allVents.has(vent))
            return;

        allVents.add(vent);
        for (const ventId of vent.network) {
            const leafVent = mapVents[ventId];
            if (leafVent === undefined) continue;

            this._getFullVentNetwork(leafVent, mapVents, allVents);
        }
    }

    getFullVentNetwork(vent: VentDataModel, mapVents: Record<number, VentDataModel>) {
        const allVents: Set<VentDataModel> = new Set;
        this._getFullVentNetwork(vent, mapVents, allVents);
        return allVents;
    }

    async onEnterVent(sender: Connection, enterVentMessage: EnterVentMessage) {
        const enterInfraction = await this.plugin.createInfraction(sender, InfractionName.ForbiddenRpcVent, { ventId: enterVentMessage.ventId }, InfractionSeverity.High);
        if (enterInfraction !== undefined) return enterInfraction;

        const existingVent = this.getPlayerVent(sender);
        if (existingVent) {
            return await this.plugin.createInfraction(sender, InfractionName.IllegalRpcVent, { ventId: enterVentMessage.ventId, alreadyInVent: existingVent.id }, InfractionSeverity.Medium);
        }

        const player = sender.getPlayer();
        const playerTransform = player?.transform;
        if (playerTransform) {
            const vent = this.getVentById(enterVentMessage.ventId);
            if (vent && new Vector2(vent.position).dist(playerTransform.position) < 3) {
                return;
            }
        }
        return await this.plugin.createInfraction(sender, InfractionName.IllegalRpcVent, { ventId: enterVentMessage.ventId, position: playerTransform?.position }, InfractionSeverity.Medium);
    }
    
    async onExitVent(sender: Connection, exitVentMessage: ExitVentMessage) {
        const exitInfraction = await this.plugin.createInfraction(sender, InfractionName.ForbiddenRpcVent, { ventId: exitVentMessage.ventId }, InfractionSeverity.High);
        if (exitInfraction !== undefined) return exitInfraction;

        const mapVents = this.getVentsInMap();
        const playerVent = this.getPlayerVent(sender);
        if (playerVent === undefined || mapVents === undefined) {
            return await this.plugin.createInfraction(sender, InfractionName.IllegalRpcVent, { ventId: exitVentMessage.ventId }, InfractionSeverity.Medium);
        }
        const network = this.getFullVentNetwork(playerVent, mapVents); // player exited out of vent not in the network of the vent they entered
        if (!network.has(playerVent)) {
            return await this.plugin.createInfraction(sender, InfractionName.IllegalRpcVent, { ventId: exitVentMessage.ventId }, InfractionSeverity.Medium);
        }
    }

    async onSnapTo(sender: Connection, snapToMessage: SnapToMessage) {
        if (!this.plugin.room.shipStatus) {
            return await this.plugin.createInfraction(sender, InfractionName.InvalidRpcTeleport, { ventId: -2, position: snapToMessage.position }, InfractionSeverity.High);
        }

        if (this.plugin.room.settings.map === GameMap.Airship) {
            // players are allowed to snap-to to some locations for the first X seconds of the game
            if (Date.now() < this.lastRoundStartedAt + (this.roundIdIdx === 0 ? 30000 : 20000)) {
                for (const allowedTeleport of allowedAirshipLocations) {
                    if (allowedTeleport.dist(snapToMessage.position) < 1)
                        return;
                }
                return await this.plugin.createInfraction(sender, InfractionName.InvalidRpcTeleport, { ventId: -2, position: snapToMessage.position }, InfractionSeverity.High);
            }
        }

        const mapVents = this.getVentsInMap();
        const vent = this.getPlayerVent(sender);
        if (vent === undefined || mapVents === undefined)
            return await this.plugin.createInfraction(sender, InfractionName.InvalidRpcTeleport, { ventId: -1, position: snapToMessage.position }, InfractionSeverity.High);

        const network = this.getFullVentNetwork(vent, mapVents);
        for (const vent of network) {
            if (new Vector2(vent.position).dist(snapToMessage.position) < 1) {
                return;
            }
        }
        return await this.plugin.createInfraction(sender, InfractionName.InvalidRpcTeleport, { ventId: vent.id, position: snapToMessage.position }, InfractionSeverity.High);
    }

    @EventListener()
    onGameStart(ev: RoomGameStartEvent) {
        this.lastRoundStartedAt = Date.now();
        this.roundIdIdx = 0;
    }

    @EventListener()
    onMeetingEnd(ev: MeetingHudVotingCompleteEvent) {
        this.lastRoundStartedAt = Date.now();
        this.roundIdIdx++;
    }
}