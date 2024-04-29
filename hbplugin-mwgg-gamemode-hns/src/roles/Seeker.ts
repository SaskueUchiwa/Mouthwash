import {
    DoorsDoorCloseEvent,
    PlayerData,
    RoleTeamType,
    Room
} from "@skeldjs/hindenburg";

import {
    AssetReference,
    EmojiService,
    EventListener,
    Impostor,
    ListenerType,
    MouthwashRole,
    RoleAlignment,
    RoleAssignment,
    RoleObjective,
    StartGameScreen
} from "hbplugin-mouthwashgg-api";

import { AnticheatExceptions, InfractionName } from "hbplugin-mouthwashgg-anti-cheat";

import {
    EnumValue,
    HudItem,
    KeyCode,
    Palette,
    RGBA,
    SetRoleTeamMessage
} from "mouthwash-types";
import { HnSOptionName } from "../gamemode";
import { Hider, hiderColor } from "./Hider";

export const seekerColor = new RGBA(255, 25, 25, 255);

export const SeekerOptionName = {

} as const;

@MouthwashRole("Seeker", RoleAlignment.Impostor, seekerColor, EmojiService.getEmoji("impostor"))
@RoleObjective("Hunt the hiders down!")
@AnticheatExceptions([ InfractionName.ForbiddenRpcVent ])
export class Seeker extends Impostor {
    /**
     * Whether the seeker has not yet started looking for hiders.
     */
    protected _isInLimbo: boolean;

    constructor(
        public readonly player: PlayerData<Room>
    ) {
        super(player);
        
        this._isInLimbo = false;
    }
    
    getStartGameScreen(playerRoles: RoleAssignment[], seekerCount: number): StartGameScreen {
        const hiderCount = playerRoles.filter(roleAssignment => {
            if (roleAssignment.player === this.player)
                return false;

            return roleAssignment.role === Hider;
        }).length;
        
        const subtitleText = hiderCount === 1
            ? `Hunting down ${hiderCount} ${hiderColor.text("Hider")}`
            : `Hunting down ${hiderCount} ${hiderColor.text("Hiders")}`;

        return {
            titleText: "Seeker",
            subtitleText: subtitleText,
            backgroundColor: Palette.impostorRed,
            teamPlayers: RoleAlignment.Impostor
        };
    }

    async onReady() {
        const chatAccess = this.api.gameOptions.gameOptions.get(HnSOptionName.ChatAccess)?.getValue<EnumValue<"Off"|"Hiders Only"|"Everyone">>().selectedOption;

        this.markImpostor();
        
        this.api.hudService.setHudItemVisibilityFor(HudItem.MapSabotageButtons, false, [ this.player ]);
        this.api.hudService.setHudItemVisibilityFor(HudItem.SabotageButton, true, [ this.player ]);

        if (chatAccess === "Everyone") {
            this.api.hudService.setChatVisibleFor(true, [ this.player ]);
        }
        
        // kill button overriden from Impostor because the Seeker specifically does not reset the button cooldown, see the click callback differences
        this._killButton = await this.spawnButton(
            "kill-button",
            new AssetReference("PggResources/Global", "Assets/Mods/OfficialAssets/KillButton.png"),
            {
                maxTimer: this._killCooldown,
                currentTime: 10,
                keys: [ KeyCode.Q ]
            }
        );

        this._killButton?.on("mwgg.button.click", async ev => {
            if (!this._killButton || !this.isKillButtonEnabled() || this._killButton.currentTime > 0 || !this._killTarget || this.player.playerInfo?.isDead)
                return;

            if (this._killTarget.transform) {
                this.player.transform?.snapTo(this._killTarget.transform.position);
            }
            await this.quietMurder(this._killTarget);
        });
    }
    async onRemove() {}

    @EventListener("doors.close", ListenerType.Room)
    async onDoorsClose(ev: DoorsDoorCloseEvent) {
        if (ev.player === this.player && this._isInLimbo) {
            ev.revert();
        }
    }
}