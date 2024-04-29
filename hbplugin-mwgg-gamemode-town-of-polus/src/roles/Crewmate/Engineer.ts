import {
    PlayerData,
    PlayerDieEvent,
    PlayerStartMeetingEvent,
    Room,
    SystemSabotageEvent,
    SystemStatus
} from "@skeldjs/hindenburg";

import {
    AssetReference,
    BaseRole,
    Button,
    Crewmate,
    EmojiService,
    EventListener,
    ListenerType,
    MouthwashRole,
    RoleAlignment,
    RoleGameOption,
    RoleObjective
} from "hbplugin-mouthwashgg-api";

import { AnticheatExceptions, InfractionName } from "hbplugin-mouthwashgg-anti-cheat";
import { EnumValue, GameOption, NumberValue, Palette, RGBA } from "mouthwash-types";

import { TownOfPolusOptionName } from "../../gamemode";

const engineerColor = new RGBA(248, 191, 20, 255);
const fixAsset = new AssetReference("PggResources/TownOfPolus", "Assets/Mods/TownOfPolus/Fix.png");

export const EngineerOptionName = {
    EngineerUses: `${engineerColor.text("Engineer")} Uses`
} as const;

export enum EngineerUses {
    PerRound = "Per Round",
    PerMatch = "Per Match"
}

@MouthwashRole("Engineer", RoleAlignment.Crewmate, engineerColor, EmojiService.getEmoji("engineer"))
@RoleObjective("Fix sabotages and finish your tasks")
@AnticheatExceptions([ InfractionName.ForbiddenRpcRepair, InfractionName.ForbiddenRpcCompleteTask ])
export class Engineer extends Crewmate {
    static getGameOptions(gameOptions: Map<string, GameOption>) {
        const roleOptions = new Map<any, any>([]);

        const engineerProbability = gameOptions.get(TownOfPolusOptionName.EngineerProbability);
        if (engineerProbability && engineerProbability.getValue<NumberValue>().value > 0) {
            roleOptions.set(EngineerOptionName.EngineerUses, new RoleGameOption(EngineerOptionName.EngineerUses, new EnumValue([ "Per Round", "Per Match" ], 0)));
        }

        return roleOptions as Map<string, RoleGameOption>;
    }

    private _lastSabotagedSystem?: SystemStatus;
    private _fixButton?: Button;

    private _engineerUses: EngineerUses;

    constructor(
        public readonly player: PlayerData<Room>
    ) {
        super(player);

        this._engineerUses = this.api.gameOptions.gameOptions.get(EngineerOptionName.EngineerUses)?.getValue<EnumValue<EngineerUses>>().selectedOption || EngineerUses.PerRound;
    }

    async onReady() {
        await this.spawnFixButton();

        if (this.room.shipStatus) {
            for (const [ , system ] of this.room.shipStatus.systems) {
                if (system.sabotaged) {
                    this._lastSabotagedSystem = system;
                    this._fixButton?.setSaturated(true);
                    break;
                }
            }
        }
    }

    async spawnFixButton() {
        this._fixButton = await this.spawnButton("fix-button1", fixAsset, {
            maxTimer: 0.1,
            currentTime: 0,
            saturated: false,
            color: Palette.white,
            isCountingDown: false
        });

        this._fixButton?.on("mwgg.button.click", ev => {
            if (!this._lastSabotagedSystem || this.player.playerInfo?.isDead)
                return;
                    
            this._lastSabotagedSystem.repair();
            this._fixButton?.destroy();
            this._fixButton = undefined;
        });
    }

    async onRemove() {
        this._fixButton?.destroy();
    }

    @EventListener("system.sabotage", ListenerType.Room)
    onSystemSabotage(ev: SystemSabotageEvent<Room>) {
        this._lastSabotagedSystem = ev.system;
        this._fixButton?.setSaturated(true);
    }

    @EventListener("player.startmeeting", ListenerType.Room)
    async onStartMeeting(ev: PlayerStartMeetingEvent<Room>) {
        if (this._engineerUses === EngineerUses.PerRound && !this.player.playerInfo?.isDead && !this._fixButton) {
            await this.spawnFixButton();
        }
    }

    @EventListener("player.die", ListenerType.Player)
    async onPlayerDie(ev: PlayerDieEvent<Room>) {
        this._fixButton?.destroy();
        this._fixButton = undefined;
    }
}