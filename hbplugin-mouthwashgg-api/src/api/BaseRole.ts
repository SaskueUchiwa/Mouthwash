import { AmongUsEndGames, PlayerData, PlayerMurderEvent, Room, Vector2 } from "@skeldjs/hindenburg";
import { AnyGameOptionType, EdgeAlignment, GameOption, HudLocation, Palette, Priority } from "mouthwash-types";
import { SubmergedShipStatus, SubmergedSpawnInDoneEvent } from "hbplugin-mwgg-map-submerged";
import { AssetReference, Button, ButtonSpawnInfo, RoleAssignment } from "../services";
import { MouthwashApiPlugin } from "../plugin";
import { RoleMetadata, StartGameScreen } from "./interfaces";
import { EventListener, RoleRegisteredEventListenerInfo } from "./hooks";
import { ListenerType, RoleAlignment } from "./enums";

export class RoleGameOption {
    constructor(
        public readonly key: string,
        public readonly value: AnyGameOptionType
    ) {}
}

const baseButtonPosition = new Vector2(-2.1, -0.7);

export class BaseRole {
    static metadata: RoleMetadata;
    metadata!: RoleMetadata;

    static getGameOptions(gameOptions: Map<string, GameOption>): Map<string, RoleGameOption> {
        return new Map;
    }

    room: Room;
    api: MouthwashApiPlugin;

    registeredEventListeners: RoleRegisteredEventListenerInfo[];
    buttonsCountdownWhenReady: Button[];

    constructor(
        public readonly player: PlayerData<Room>
    ) {
        this.room = player.room;
        this.api = player.room.loadedPlugins.get("hbplugin-mouthwashgg-api")?.pluginInstance as MouthwashApiPlugin;

        this.registeredEventListeners = [];
        this.buttonsCountdownWhenReady = [];

        if (!this.api) {
            throw new Error("Mouthwash API was not loaded on room");
        }
    }

    async onReady() {}
    async onRemove() {}

    async spawnButton(buttonId: string, assetRef: AssetReference, buttonInfo: Partial<ButtonSpawnInfo>) {
        const playerButtons = this.api.hudService.getPlayerHud(this.player).buttons;

        const cachedButton = playerButtons.get(buttonId);
        if (cachedButton) {
            return cachedButton;
        }

        const row = playerButtons.size % 2;
        const column = Math.floor(playerButtons.size / 2);

        const asset = await this.api.assetLoader.resolveAssetReferenceFor(assetRef, [ this.player ]);

        if (!asset)
            return undefined;

        const spawnInfo: ButtonSpawnInfo = {
            position: baseButtonPosition
                .add(new Vector2(
                    column * -1.4,
                    row * -1.4
                )),
            alignment: EdgeAlignment.LeftBottom,
            asset,
            maxTimer: 10,
            currentTime: 10,
            saturated: false,
            color: Palette.white,
            isCountingDown: !(this.room.shipStatus instanceof SubmergedShipStatus),
            z: -9,
            attachedTo: -1,
            keys: [],
            ...buttonInfo
        };

        const button = await this.api.hudService.spawnButton(
            this.player,
            buttonId,
            spawnInfo
        );
        if (buttonInfo.isCountingDown === undefined) {
            if (this.room.shipStatus instanceof SubmergedShipStatus) {
                this.buttonsCountdownWhenReady.push(button);
            }
        }
        return button;
    }

    async giveFakeTasks() {
        await Promise.all([
            this.api.hudService.setTaskInteraction(this.player, false),
            this.api.hudService.setHudStringFor(HudLocation.TaskText, "fake-tasks", Palette.impostorRed.text("Fake tasks:"), Priority.Z, [ this.player ])
        ]);
    }

    @EventListener("mwgg.submerged.spawnIn.done", ListenerType.Room)
    async onSubmergedSpawnIn(ev: SubmergedSpawnInDoneEvent) {
        for (const button of this.buttonsCountdownWhenReady) {
            button.setCountingDown(true);
        }
        this.buttonsCountdownWhenReady = [];
    }

    /**
     * There is a bug in SkeldJS in which the victim is not properly passed to the end game intent,
     * so this method is a patch for the {@link PlayerControl.murderPlayer} method.
     */
    async patchMurderPlayer(murderer: PlayerData<Room>, victim: PlayerData<Room>) {
        const murdererPlayerControl = murderer.control;
        const victimPlayerControl = victim.control;
        if (murdererPlayerControl === undefined || victimPlayerControl === undefined)
            return;

        const victimPlayerId = victim.playerId;
        if (victimPlayerId === undefined)
            return;

        victim.control?.kill("murder");
        await murderer.emit(new PlayerMurderEvent(this.room, murderer, undefined, victim));
        murdererPlayerControl["_rpcMurderPlayer"](victim);
        murdererPlayerControl["_checkMurderEndGame"](victim);
    }

    async quietMurder(victim: PlayerData<Room>) {
        await this.patchMurderPlayer(this.player, victim);
        this.room.endGameIntents = this.room.endGameIntents.filter(intent => intent.name !== AmongUsEndGames.PlayersKill || intent.metadata.victim !== victim);
    }

    getTeamPlayers() {
        const playersOnTeam = [];
        for (const [ , player ] of this.room.players) {
            const playerRole = this.api.roleService.getPlayerRole(player);
            if (playerRole && playerRole.metadata.alignment === this.metadata.alignment) {
                playersOnTeam.push(player);
            }
        }
        return playersOnTeam;
    }

    getStartGameScreen(playerRoles: RoleAssignment[], impostorCount: number): StartGameScreen {
        return {
            titleText: this.metadata.roleName,
            subtitleText: this.metadata.roleObjective,
            backgroundColor: this.metadata.themeColor,
            teamPlayers: this.metadata.alignment === RoleAlignment.Impostor
                ? RoleAlignment.Impostor
                : RoleAlignment.All
        };
    }
}

export interface RoleCtr<T extends BaseRole = BaseRole> {
    metadata: RoleMetadata;
    new(player: PlayerData<Room>): T;
}

export interface UntypedRoleCtr {
    metadata: RoleMetadata;
    new(...args: any): BaseRole;
}