import {
    GameMap,
    MeetingHudCloseEvent,
    PlayerData,
    PlayerDieEvent,
    PlayerMoveEvent,
    Room,
    RoomFixedUpdateEvent,
    SystemType
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
    HudLocation,
    NumberValue,
    PlayerAnimationKeyframe,
    RGBA
} from "mouthwash-types";

import { AnticheatExceptions, InfractionName } from "hbplugin-mouthwashgg-anti-cheat";

import { TownOfPolusGamemodePlugin, TownOfPolusOptionName } from "../../gamemode";
import { Bounds } from "../../util/Bounds";

const trapperColor = new RGBA(150, 150, 150, 255);

export const TrapperOptionName = {
    TrapperCooldown: `${trapperColor.text("Trapper")} Cooldown`,
    TrapDuration: `${trapperColor.text("Trap")} Duration`
} as const;

const mapRoomBounds: Record<GameMap, Partial<Record<SystemType, Bounds>>> = {
    [GameMap.TheSkeld]: {

    },
    [GameMap.MiraHQ]: {

    },
    [GameMap.Polus]: {

    },
    [GameMap.AprilFoolsTheSkeld]: {

    },
    [GameMap.Airship]: {

    },
    [5 as GameMap]: {

    }
};

@MouthwashRole("Trapper", RoleAlignment.Impostor, trapperColor, EmojiService.getEmoji("impostor"))
@RoleObjective(`Sabotage and kill the crewmates.
Trap crewmates inside rooms so they can't escape.`)
@AnticheatExceptions([ InfractionName.ForbiddenRpcSabotage, InfractionName.ForbiddenRpcVent, InfractionName.ForbiddenRpcCloseDoors ])
export class Trapper extends Impostor {
    static getGameOptions(gameOptions: Map<string, GameOption>) {
        const roleOptions = new Map<any, any>([]);

        const trapperProbability = gameOptions.get(TownOfPolusOptionName.TrapperProbability);
        if (trapperProbability && trapperProbability.getValue<NumberValue>().value > 0) {
            roleOptions.set(TrapperOptionName.TrapperCooldown, new RoleGameOption(TrapperOptionName.TrapperCooldown, new NumberValue(30, 2.5, 10, 60, false, "{0}s")));
            roleOptions.set(TrapperOptionName.TrapDuration, new RoleGameOption(TrapperOptionName.TrapDuration, new NumberValue(8, 1, 5, 30, false, "{0}s")));
        }

        return roleOptions as Map<string, RoleGameOption>;
    }

    protected _trapButton?: Button;

    protected _trapCooldown: number;
    protected _trapDuration: number;

    protected _remainingTrapTime: number|undefined;
    protected _remainingUpdateTime: number|undefined;

    constructor(
        public readonly player: PlayerData<Room>
    ) {
        super(player);

        this._trapCooldown = this.api.gameOptions.gameOptions.get(TrapperOptionName.TrapperCooldown)?.getValue<NumberValue>().value ?? 30;
        this._trapDuration = this.api.gameOptions.gameOptions.get(TrapperOptionName.TrapDuration)?.getValue<NumberValue>().value ?? 8;

        this._remainingTrapTime = undefined;
        this._remainingUpdateTime = undefined;
    }

    async onReady() {
        await super.onReady();
        await this.giveFakeTasks();

        this._trapButton = await this.spawnButton("trap-button", new AssetReference("PggResources/TownOfPolus", "Assets/Mods/TownOfPolus/Swoop.png"), {
            maxTimer: this._trapCooldown,
            saturated: true,
            currentTime: this._trapCooldown
        });

        this._trapButton?.on("mwgg.button.click", ev => {
            if (!this._trapButton || this._trapButton.currentTime > 0 || this.player.playerInfo?.isDead)
                return;

            this._remainingTrapTime = this._trapDuration * 1000;
            this.animateGoInvisible();
            this._trapButton?.setSaturated(false);
            this._trapButton?.setCountingDown(false);
        });
    }

    getCurrentSystem() {

    }
    
    animateGoInvisible() {
        this.api.hudService.setHudStringFor(HudLocation.RoomTracker, "trap-duration", this._trapDuration.toString(), 0, [ this.player ]);
        this.api.targettableService.setTargettable(this.player, false);
    }

    animateGoVisible() {
        this.api.hudService.removeHudStringFor(HudLocation.RoomTracker, "invisibility-duration", [ this.player ]);
        this.api.targettableService.setTargettable(this.player, true);

        this.api.animationService.beginPlayerAnimation(this.player, [
            new PlayerAnimationKeyframe(0, 50, { opacity: 1, hatOpacity: 1, skinOpacity: 1, petOpacity: 1, nameOpacity: 1 })
        ], false);
        this._remainingTrapTime = undefined;
    }

    @EventListener("player.die", ListenerType.Player)
    onPlayerDie(ev: PlayerDieEvent<Room>) {
        this._trapButton?.destroy();
        this.animateGoVisible();
    }

    @EventListener("meeting.close", ListenerType.Room)
    onMeetingClose(ev: MeetingHudCloseEvent<Room>) {
        this.animateGoVisible();

        if (!this._trapButton)
            return;

        this._trapButton.setCurrentTime(this._trapButton.maxTimer);
        this._trapButton.setSaturated(true);
        this._trapButton.setCountingDown(true);
    }

    @EventListener("room.fixedupdate", ListenerType.Room)
    onFixedUpdate(ev: RoomFixedUpdateEvent<Room>) {
        if (this._remainingTrapTime === undefined || !this._trapButton)
            return;

        this._remainingTrapTime -= ev.delta;
        if (this._remainingUpdateTime !== undefined) {
            this._remainingUpdateTime -= ev.delta;
        }

        if (this._remainingUpdateTime === undefined || this._remainingUpdateTime < 0) {
            this.api.hudService.setHudStringFor(HudLocation.RoomTracker, "invisibility-duration", Math.ceil(this._remainingTrapTime / 1000).toString(), 0, [ this.player ]);
            this._remainingUpdateTime = 0.5;
        }
    
        if (this._remainingTrapTime <= 0) {
            this.animateGoVisible();
            this._trapButton.setCurrentTime(this._trapButton.maxTimer);
            this._trapButton.setSaturated(true);
            this._trapButton.setCountingDown(true);
            this._remainingTrapTime = undefined;
            this._remainingUpdateTime = undefined;
        }
    }

    @EventListener("player.move", ListenerType.Room)
    onPlayerMove(ev: PlayerMoveEvent<Room>) {
        const boundsForMap = TownOfPolusGamemodePlugin.MapRoomBounds[this.room.settings.map as GameMap];
        for (const { systemId, bounds } of boundsForMap!) {
            if (bounds.contains(ev.position)) {
                // console.log("Player %s in %s", ev.player, systemId);
            }
        }
    }
}