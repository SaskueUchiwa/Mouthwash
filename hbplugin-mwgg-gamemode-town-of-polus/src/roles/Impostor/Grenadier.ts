import {
    MeetingHudCloseEvent,
    PlayerData,
    Room,
    RoomFixedUpdateEvent,
    Vector2
} from "@skeldjs/hindenburg";

import {
    AssetReference,
    AudioAsset,
    Button,
    ButtonFixedUpdateEvent,
    Crewmate,
    EmojiService,
    EventListener,
    Impostor,
    ListenerType,
    MouthwashRole,
    RoleAlignment,
    RoleGameOption,
    RoleObjective,
    Sound
} from "hbplugin-mouthwashgg-api";

import {
    CameraAnimationKeyframe,
    GameOption,
    KeyCode,
    NumberValue,
    Palette,
    PlayerAnimationKeyframe,
    RGBA
} from "mouthwash-types";
import { AnticheatExceptions, InfractionName } from "hbplugin-mouthwashgg-anti-cheat";

import { TownOfPolusOptionName } from "../../gamemode";

const grenadierColor = new RGBA(15, 61, 120, 255);

export const GrenadierOptionName = {
    GrenadierCooldown: `${grenadierColor.text("Grenadier")} Cooldown`,
    GrenadierBlindness: `${grenadierColor.text("Grenadier")} Blindness`
} as const;

@MouthwashRole("Grenadier", RoleAlignment.Impostor, grenadierColor, EmojiService.getEmoji("grenadier"))
@RoleObjective("Use the flashbangs to blind the " + Crewmate.metadata.themeColor.text("Crewmates"))
@AnticheatExceptions([ InfractionName.ForbiddenRpcSabotage, InfractionName.ForbiddenRpcVent, InfractionName.ForbiddenRpcCloseDoors ])
export class Grenadier extends Impostor {
    static getGameOptions(gameOptions: Map<string, GameOption>) {
        const roleOptions = new Map<any, any>([]);

        const grenadierProbability = gameOptions.get(TownOfPolusOptionName.GrenadierProbability);
        if (grenadierProbability && grenadierProbability.getValue<NumberValue>().value > 0) {
            roleOptions.set(GrenadierOptionName.GrenadierCooldown, new RoleGameOption(GrenadierOptionName.GrenadierCooldown, new NumberValue(25, 2.5, 10, 60, false, "{0}s")));
            roleOptions.set(GrenadierOptionName.GrenadierBlindness, new RoleGameOption(GrenadierOptionName.GrenadierBlindness, new NumberValue(2, 0.5, 0.5, 15, false, "{0}s")));
        }

        return roleOptions as Map<string, RoleGameOption>;
    }

    protected _throwButton?: Button;

    protected _cooldownDuration: number;
    protected _blindnessDuration: number;
    
    protected _grenadierRange: number;
    protected _buttonResetCountdown: number|undefined;

    constructor(
        public readonly player: PlayerData<Room>
    ) {
        super(player);

        this._cooldownDuration = this.api.gameOptions.gameOptions.get(GrenadierOptionName.GrenadierCooldown)?.getValue<NumberValue>().value ?? 25;
        this._blindnessDuration = this.api.gameOptions.gameOptions.get(GrenadierOptionName.GrenadierBlindness)?.getValue<NumberValue>().value ?? 2;

        this._grenadierRange = 5.5;
        this._buttonResetCountdown = undefined;
    }

    async onReady() {
        await super.onReady();

        this._throwButton = await this.spawnButton(
            "throw-button",
            new AssetReference("PggResources/TownOfPolus", "Assets/Mods/TownOfPolus/Throw.png"),
            {
                maxTimer: this._cooldownDuration,
                saturated: true,
                currentTime: 10,
                keys: [ KeyCode.X ]
            }
        );

        this._throwButton?.on("mwgg.button.click", async ev => {
            if (!this._throwButton || this._throwButton.currentTime > 0 || this.player.playerInfo?.isDead || !this.player.transform)
                return;
            
            const playersInRange = this.getPossibleTargets();
            const flashbangAsset = await this.api.assetLoader.resolveAssetReference(
                new AssetReference("PggResources/TownOfPolus", "Assets/Mods/TownOfPolus/FlashbangSfx.mp3")
            ) as AudioAsset;

            this._throwButton.setCurrentTime(this._throwButton.maxTimer);
            this._throwButton.setCountingDown(false);
            this._buttonResetCountdown = 450 + this._blindnessDuration * 1000;

            this.api.soundService.playSound(new Sound(flashbangAsset, flashbangAsset.audioType, { }), this.player.transform.position, playersInRange);

            for (const playerFlashed of playersInRange) {
                this.api.animationService.beginCameraAnimation(playerFlashed,  [
                    new CameraAnimationKeyframe(0, 75, { position: Vector2.null, rotation: 0, color: new RGBA(255, 255, 255, 0) }),
                    new CameraAnimationKeyframe(75, 75, { position: Vector2.null, rotation: 0, color: new RGBA(255, 255, 255, 255) }),
                    new CameraAnimationKeyframe(150 + this._blindnessDuration * 1000, 300, { position: Vector2.null, rotation: 0, color: new RGBA(255, 255, 255, 0) })
                ], false);
                
                this.api.animationService.beginPlayerAnimation(playerFlashed,  [
                    new PlayerAnimationKeyframe(0, 150, { visorColor: new RGBA(255, 255, 255, 255) }),
                    new PlayerAnimationKeyframe(150 + this._blindnessDuration * 1000, 300, { visorColor: Palette.playerVisor })
                ], true);
            }
        });
    }

    async onRemove() {}

    getPossibleTargets() {
        if (!this.player.transform) return [];

        const players = [];
        for (const [ , player ] of this.room.players) {
            const playerInfo = player.playerInfo;
            if (playerInfo && player.transform && player !== this.player && !playerInfo.isImpostor && !playerInfo.isDead && player.transform.position.dist(this.player.transform.position) < this._grenadierRange) {
                players.push(player);
            }
        }
        return players;
    }

    @EventListener("meeting.close", ListenerType.Room)
    onMeetingEnd(ev: MeetingHudCloseEvent<Room>) {
        if (!this._throwButton)
            return;

        this._throwButton.setCurrentTime(this._throwButton.maxTimer);
    }

    @EventListener("mwgg.button.fixedupdate", ListenerType.Room)
    onButtonFixedUpdate(ev: ButtonFixedUpdateEvent) {

    }

    @EventListener("room.fixedupdate", ListenerType.Room)
    onFixedUpdate(ev: RoomFixedUpdateEvent<Room>) {
        if (this._buttonResetCountdown === undefined || !this._throwButton) return;

        this._buttonResetCountdown -= ev.delta;

        if (this._buttonResetCountdown <= 0) {
            this._throwButton.setCountingDown(true);
            this._throwButton.setCurrentTime(this._throwButton.maxTimer);
            this._buttonResetCountdown = undefined;
        }
    }
}