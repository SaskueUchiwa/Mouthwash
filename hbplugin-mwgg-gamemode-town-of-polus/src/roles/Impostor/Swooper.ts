import {
    MeetingHudCloseEvent,
    PlayerData,
    PlayerDieEvent,
    Room,
    RoomFixedUpdateEvent
} from "@skeldjs/hindenburg";

import {
    AssetReference,
    Button,
    EmojiService,
    EventListener,
    Impostor,
    ListenerType,
    MouthwashRole,
    RoleAlignment,
    RoleGameOption,
    RoleObjective
} from "hbplugin-mouthwashgg-api";

import {
    GameOption,
    HudItem,
    HudLocation,
    NumberValue,
    PlayerAnimationKeyframe,
    RGBA
} from "mouthwash-types";
import { AnticheatExceptions, InfractionName } from "hbplugin-mouthwashgg-anti-cheat";

import { TownOfPolusOptionName } from "../../gamemode";

const swooperColor = new RGBA(150, 150, 150, 255);

export const SwooperOptionName = {
    SwooperCooldown: `${swooperColor.text("Swooper")} Cooldown`,
    SwooperDuration: `${swooperColor.text("Swooper")} Duration`
} as const;

@MouthwashRole("Swooper", RoleAlignment.Impostor, swooperColor, EmojiService.getEmoji("swooper"))
@RoleObjective(`Sabotage and kill the crewmates.
Use the swoop ability to turn invisible.`)
@AnticheatExceptions([ InfractionName.ForbiddenRpcSabotage, InfractionName.ForbiddenRpcVent, InfractionName.ForbiddenRpcCloseDoors ])
export class Swooper extends Impostor {
    static getGameOptions(gameOptions: Map<string, GameOption>) {
        const roleOptions = new Map<any, any>([]);

        const swooperProbability = gameOptions.get(TownOfPolusOptionName.SwooperProbability);
        if (swooperProbability && swooperProbability.getValue<NumberValue>().value > 0) {
            roleOptions.set(SwooperOptionName.SwooperCooldown, new RoleGameOption(SwooperOptionName.SwooperCooldown, new NumberValue(30, 2.5, 10, 60, false, "{0}s")));
            roleOptions.set(SwooperOptionName.SwooperDuration, new RoleGameOption(SwooperOptionName.SwooperDuration, new NumberValue(8, 1, 5, 30, false, "{0}s")));
        }

        return roleOptions as Map<string, RoleGameOption>;
    }

    protected _invisibleButton?: Button;

    protected _invisibleCooldown: number;
    protected _invisibleDuration: number;

    protected _remainingInvisibilityTime: number|undefined;
    protected _remainingUpdateTime: number|undefined;

    constructor(
        public readonly player: PlayerData<Room>
    ) {
        super(player);

        this._invisibleCooldown = this.api.gameOptions.gameOptions.get(SwooperOptionName.SwooperCooldown)?.getValue<NumberValue>().value ?? 30;
        this._invisibleDuration = this.api.gameOptions.gameOptions.get(SwooperOptionName.SwooperDuration)?.getValue<NumberValue>().value ?? 8;

        this._remainingInvisibilityTime = undefined;
        this._remainingUpdateTime = undefined;
    }

    async onReady() {
        await super.onReady();
        await this.giveFakeTasks();

        this._invisibleButton = await this.spawnButton("invisible-button", new AssetReference("PggResources/TownOfPolus", "Assets/Mods/TownOfPolus/Swoop.png"), {
            maxTimer: this._invisibleCooldown,
            saturated: true,
            currentTime: this._invisibleCooldown
        });

        this._invisibleButton?.on("mwgg.button.click", ev => {
            if (!this._invisibleButton || this._invisibleButton.currentTime > 0 || this.player.playerInfo?.isDead)
                return;

            this._remainingInvisibilityTime = this._invisibleDuration * 1000;
            this.animateGoInvisible();
            this._invisibleButton?.setSaturated(false);
            this._invisibleButton?.setCountingDown(false);
        });
    }
    
    animateGoInvisible() {
        this.api.hudService.setHudStringFor(HudLocation.RoomTracker, "invisibility-duration", this._invisibleDuration.toString(), 0, [ this.player ]);
        this.api.targettableService.setTargettable(this.player, false);

        const deadPlayersOrSelf = [];
        const alivePlayers = [];
        for (const [ , player ] of this.room.players) {
            const playerInfo = player.playerInfo;
            if (player === this.player || (playerInfo && playerInfo.isDead)) {
                deadPlayersOrSelf.push(player);
                continue;
            }

            alivePlayers.push(player);
        }

        this.api.animationService.beginPlayerAnimationFor(this.player, [
            new PlayerAnimationKeyframe(0, 50, { opacity: 0.3, hatOpacity: 0.3, skinOpacity: 0.3, petOpacity: 0.3, nameOpacity: 0.3 })
        ], false, deadPlayersOrSelf);

        this.api.animationService.beginPlayerAnimationFor(this.player, [
            new PlayerAnimationKeyframe(0, 50, { opacity: 0, hatOpacity: 0, skinOpacity: 0, petOpacity: 0, nameOpacity: 0 })
        ], false, alivePlayers);
    }

    animateGoVisible() {
        this.api.hudService.removeHudStringFor(HudLocation.RoomTracker, "invisibility-duration", [ this.player ]);
        this.api.targettableService.setTargettable(this.player, true);

        this.api.animationService.beginPlayerAnimation(this.player, [
            new PlayerAnimationKeyframe(0, 50, { opacity: 1, hatOpacity: 1, skinOpacity: 1, petOpacity: 1, nameOpacity: 1 })
        ], false);

        this._remainingInvisibilityTime = undefined;
    }

    @EventListener("player.die", ListenerType.Player)
    onPlayerDie(ev: PlayerDieEvent<Room>) {
        this._invisibleButton?.destroy();
        this.animateGoVisible();
    }

    @EventListener("meeting.close", ListenerType.Room)
    onMeetingClose(ev: MeetingHudCloseEvent<Room>) {
        this.animateGoVisible();

        if (!this._invisibleButton)
            return;

        this._invisibleButton.setCurrentTime(this._invisibleButton.maxTimer);
        this._invisibleButton.setSaturated(true);
        this._invisibleButton.setCountingDown(true);
    }

    @EventListener("room.fixedupdate", ListenerType.Room)
    onFixedUpdate(ev: RoomFixedUpdateEvent<Room>) {
        if (this._remainingInvisibilityTime === undefined || !this._invisibleButton)
            return;

        this._remainingInvisibilityTime -= ev.delta;
        if (this._remainingUpdateTime !== undefined) {
            this._remainingUpdateTime -= ev.delta;
        }

        if (this._remainingUpdateTime === undefined || this._remainingUpdateTime < 0) {
            this.api.hudService.setHudStringFor(HudLocation.RoomTracker, "invisibility-duration", Math.ceil(this._remainingInvisibilityTime / 1000).toString(), 0, [ this.player ]);
            this._remainingUpdateTime = 0.5;
        }
    
        if (this._remainingInvisibilityTime <= 0) {
            this.animateGoVisible();
            this._invisibleButton.setCurrentTime(this._invisibleButton.maxTimer);
            this._invisibleButton.setSaturated(true);
            this._invisibleButton.setCountingDown(true);
            this._remainingInvisibilityTime = undefined;
            this._remainingUpdateTime = undefined;
        }
    }
}