import {
    PlayerData,
    PlayerDieEvent,
    PlayerMoveEvent,
    Room,
    Vector2
} from "@skeldjs/hindenburg";

import {
    Crewmate,
    DefaultRoomOptionName,
    EmojiService,
    EventListener,
    ListenerType,
    MouthwashRole,
    RoleAlignment,
    RoleAssignment,
    RoleObjective,
    StartGameScreen
} from "hbplugin-mouthwashgg-api";

import {
    EnumValue,
    NumberValue,
    Palette,
    PlayerAnimationKeyframe,
    RGBA
} from "mouthwash-types";
import { AnticheatExceptions, InfractionName } from "hbplugin-mouthwashgg-anti-cheat";

import { seekerColor } from "./Seeker";
import { HnSOptionName } from "../gamemode";

export const hiderColor = new RGBA(255, 140, 140, 255);

export const HiderOptionName = {

} as const;

@MouthwashRole("Hider", RoleAlignment.Crewmate, hiderColor, EmojiService.getEmoji("crewmate"))
@RoleObjective(`Finish your tasks and escape from the ${seekerColor.text("Seekers")}!`)
@AnticheatExceptions([ InfractionName.ForbiddenRpcCompleteTask ])
export class Hider extends Crewmate {
    protected _playerSpeed: number;

    constructor(
        public readonly player: PlayerData<Room>
    ) {
        super(player);

        this._playerSpeed = this.api.gameOptions.gameOptions.get(DefaultRoomOptionName.PlayerSpeed)?.getValue<NumberValue>().value ?? 1.25;
    }
    
    getStartGameScreen(playerRoles: RoleAssignment[], seekerCount: number): StartGameScreen {
        const subtitleText = seekerCount === 1
            ? `Hiding from ${seekerCount} ${seekerColor.text("Seeker")}`
            : `Hiding from ${seekerCount} ${seekerColor.text("Seekers")}`;

        return {
            titleText: "Hider",
            subtitleText: subtitleText,
            backgroundColor: Palette.crewmateBlue,
            teamPlayers: RoleAlignment.Crewmate
        };
    }

    async onReady() {
        const chatAccess = this.api.gameOptions.gameOptions.get(HnSOptionName.ChatAccess)?.getValue<EnumValue<"Off"|"Hiders Only"|"Everyone">>().selectedOption;

        this.api.animationService.beginPlayerAnimation(this.player, [
            new PlayerAnimationKeyframe(0, 0, { petOpacity: 0, skinOpacity: 0, hatOpacity: 0, opacity: 0, nameOpacity: 0 })
        ], false);

        if (chatAccess !== "Off") {
            this.api.hudService.setChatVisibleFor(true, [ this.player ]);
        }
    }
    async onRemove() {}

    @EventListener("player.move", ListenerType.Player)
    async onPlayerMove(ev: PlayerMoveEvent) {
        const playerInfo = this.player.playerInfo;
        if (!playerInfo || playerInfo.isDead)
            return;

        const opacity = ev.velocity.dist(Vector2.null) / this._playerSpeed;
        const clampedOpacity = Vector2.clamp(opacity, 0, 0.7);

        this.api.animationService.beginPlayerAnimation(this.player, [
            new PlayerAnimationKeyframe(0, 100, { petOpacity: clampedOpacity, hatOpacity: clampedOpacity, skinOpacity: clampedOpacity, opacity: clampedOpacity, nameOpacity: clampedOpacity })
        ], false);
    }

    @EventListener("player.die", ListenerType.Player)
    async onPlayerDie(ev: PlayerDieEvent) {
        this.api.animationService.beginPlayerAnimation(this.player, [
            new PlayerAnimationKeyframe(0, 100, { petOpacity: 1, hatOpacity: 1, skinOpacity: 1, opacity: 1, nameOpacity: 1 })
        ], false);
    }
}