import {
    EndGameIntent,
    GameOverReason,
    PlayerData,
    PlayerDieEvent,
    Room
} from "@skeldjs/hindenburg";
import { AnticheatExceptions, InfractionName } from "hbplugin-mouthwashgg-anti-cheat";

import {
    AssetReference,
    BaseRole,
    EmojiService,
    EndGameScreen,
    EventListener,
    ListenerType,
    MouthwashRole,
    RoleAlignment,
    RoleGameOption,
    RoleObjective
} from "hbplugin-mouthwashgg-api";

import {
    GameOption,
    Palette,
    RGBA
} from "mouthwash-types";

const jesterColor = new RGBA(255, 140, 238, 255);

export const JesterOptionName = {

} as const;

@MouthwashRole("Jester", RoleAlignment.Neutral, jesterColor, EmojiService.getEmoji("jester"))
@RoleObjective("Trick everyone into voting you out")
@AnticheatExceptions([ InfractionName.ForbiddenRpcRepair ])
export class Jester extends BaseRole {
    static getGameOptions(gameOptions: Map<string, GameOption>) {
        const roleOptions = new Map<any, any>([]);
        return roleOptions as Map<string, RoleGameOption>;
    }

    constructor(
        public readonly player: PlayerData<Room>
    ) {
        super(player);
    }

    async onReady() {
        await this.giveFakeTasks();
    }

    @EventListener("player.die", ListenerType.Player)
    async onPlayerDie(ev: PlayerDieEvent) {
        if (ev.reason === "exiled") {
            const players = this.api.getEndgamePlayers();
            this.room.registerEndGameIntent(
                new EndGameIntent(
                    "jester voted out",
                    GameOverReason.None,
                    {
                        endGameScreen: new Map(players.map<[number, EndGameScreen]>(playerRole => {
                            return [
                                playerRole.player.playerId!,
                                {
                                    titleText: playerRole === this ? "Victory" : Palette.impostorRed.text("Defeat"),
                                    subtitleText: `The ${jesterColor.text("Jester")} was voted out`,
                                    backgroundColor: jesterColor,
                                    yourTeam: [ this.player ],
                                    winSound: new AssetReference("PggResources/TownOfPolus", "Assets/Mods/TownOfPolus/JesterSfx.mp3"),
                                    hasWon: playerRole === this
                                }
                            ];
                        }))
                    }
                )
            );
        }
    }
}