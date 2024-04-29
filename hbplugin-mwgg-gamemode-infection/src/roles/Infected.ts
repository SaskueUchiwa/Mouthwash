import {
    EndGameIntent,
    GameOverReason,
    PlayerData,
    PlayerMurderEvent,
    RoleTeamType,
    Room,
    RpcMessage
} from "@skeldjs/hindenburg";

import {
    AnyKillDistance,
    AssetReference,
    EmojiService,
    EndGameScreen,
    Impostor,
    MouthwashRole,
    RoleAlignment,
    RoleAssignment,
    RoleObjective,
    RoleStringNames,
    StartGameScreen,
    killDistanceToRange
} from "hbplugin-mouthwashgg-api";

import { AnticheatExceptions, InfractionName } from "hbplugin-mouthwashgg-anti-cheat";

import {
    BooleanValue,
    EnumValue,
    HudItem,
    HudLocation,
    KeyCode,
    NumberValue,
    Palette,
    Priority,
    RGBA,
    SetPlayerSpeedModifierMessage,
    SetPlayerVisionModifierMessage,
    SetRoleTeamMessage,
    WinSound
} from "mouthwash-types";
import { uninfectedColor } from "./Uninfected";
import { InfectionGamemodePlugin, InfectionOptionName } from "../gamemode";

export const infectedColor = new RGBA(255, 25, 25, 255);

@MouthwashRole("Infected", RoleAlignment.Impostor, infectedColor, EmojiService.getEmoji("impostor"))
@RoleObjective("You're infected! Spread the infection and infect\nall Crewmates to win.")
@AnticheatExceptions([ /* InfractionName.ForbiddenRpcVent, */ InfractionName.ForbiddenRpcCloseDoors ])
export class Infected extends Impostor {
    getStartGameScreen(playerRoles: RoleAssignment[], zombieCount: number): StartGameScreen {
        const crewmateCount = playerRoles.filter(roleAssignment => {
            return roleAssignment.role.metadata.alignment === RoleAlignment.Crewmate;
        }).length;
        
        const subtitleText = crewmateCount === 1
            ? `Hunting down ${crewmateCount} ${Palette.crewmateBlue.text("Crewmates")}`
            : `Hunting down ${crewmateCount} ${Palette.crewmateBlue.text("Crewmates")}`;

        return {
            titleText: "Infected",
            subtitleText: subtitleText,
            backgroundColor: Palette.impostorRed,
            teamPlayers: RoleAlignment.Impostor
        };
    }

    protected _infectedSpeed: number;
    protected _infectedVision: number;
    protected _canInfectedCloseDoors: boolean;

    protected _totalInfections: number;

    constructor(public readonly player: PlayerData<Room>) {
        super(player);

        this._infectedSpeed = this.api.gameOptions.gameOptions.get(InfectionOptionName.InfectedSpeed)?.getValue<NumberValue>().value || 1.25;
        this._infectedVision = this.api.gameOptions.gameOptions.get(InfectionOptionName.InfectedVision)?.getValue<NumberValue>().value || .75;
        this._canInfectedCloseDoors = this.api.gameOptions.gameOptions.get(InfectionOptionName.InfectedCloseDoors)?.getValue<BooleanValue>().enabled || false;
        this._killRange = killDistanceToRange[this.api.gameOptions.gameOptions.get(InfectionOptionName.InfectDistance)?.getValue<EnumValue<AnyKillDistance>>().selectedOption || "Short"];
        this._killCooldown = this.api.gameOptions.gameOptions.get(InfectionOptionName.InfectCooldown)?.getValue<NumberValue>().value ?? 10;

        this._totalInfections = 0;
    }

    async onReady() {
        await this.markImpostor();

        this._killButton = await this.spawnButton(
            "kill-button",
            new AssetReference("PggResources/Global", "Assets/Mods/OfficialAssets/KillButton.png"),
            {
                maxTimer: this._killCooldown,
                currentTime: 20,
                keys: [ KeyCode.Q ]
            }
        );

        this._killButton?.on("mwgg.button.click", async ev => {
            if (!this._killButton || !this.isKillButtonEnabled() || this._killButton.currentTime > 0 || !this._killTarget || this.player.playerInfo?.isDead)
                return;

            if (this._killCooldown > 0) {
                this._killButton.setCurrentTime(this._killButton.maxTimer);
            }
            if (this._killTarget.transform) {
                this.player.transform?.snapTo(this._killTarget.transform.position);
            }
            await this.quietMurder(this._killTarget);
            this._totalInfections++;
            this._killTarget.playerInfo?.setDead(false);
            if (await this.checkForAllInfectedEndGame(this._killTarget))
                return;

            if (this.api.gamemode && this.api.gamemode instanceof InfectionGamemodePlugin && await this.api.gamemode.checkTaskEndGame(this._killTarget))
                return;

            const originalRole = this.api.roleService.getPlayerRole(this._killTarget);
            const previousEmoji = originalRole?.metadata.emoji || EmojiService.getEmoji("crewmate");
            await this.api.roleService.removeRole(this._killTarget);
            const role = await this.api.roleService.assignRole(this._killTarget, Infected);
            this.api.hudService.setHudStringFor(
                HudLocation.TaskText,
                RoleStringNames.TaskObjective,
                `${infectedColor.text("Role: Infected\nYou've been infected! Go find other crewmates\nto spread the infection!")}`,
                Priority.A,
                [ role.player ]
            );
            await this.api.nameService.removeEmoji(role.player, previousEmoji);
            await this.room.broadcastMessages(
                [
                    new RpcMessage(
                        role.player.control!.netId,
                        new SetPlayerSpeedModifierMessage(this._infectedSpeed)
                    ),
                    new RpcMessage(
                        role.player.control!.netId,
                        new SetPlayerVisionModifierMessage(this._infectedVision)
                    )
                ]
            );
            this.api.hudService.setHudItemVisibilityFor(HudItem.MapDoorButtons, this._canInfectedCloseDoors, [ role.player ]);
            this.api.hudService.setHudItemVisibilityFor(HudItem.SabotageButton, this._canInfectedCloseDoors, [ role.player ]);
            this.api.hudService.setTaskInteraction(role.player, false, false);
            // we probably dont need to add the emoji, as it's done in Infected.onReady
            // this.api.nameService.addEmojiFor(role.player, role.metadata.emoji, [ role.player ]);
            if (this._killTarget.playerInfo?.roleType) {
                const targetConnection = this.room.getConnection(this._killTarget);
                if (targetConnection) {
                    this._killTarget.playerInfo.roleType.roleMetadata.roleTeam = RoleTeamType.Impostor;
                    this.api.room.broadcastMessages([],
                        [ new SetRoleTeamMessage(RoleTeamType.Impostor) ],
                        [ targetConnection ]);
                }
            }
            await role.onReady();
        });

        // allow all players to see the emoji to identify infected
        await this.api.nameService.removeEmojiFor(this.player, this.metadata.emoji, [ this.player ]);
        await this.api.nameService.addEmoji(this.player, this.metadata.emoji);
    }

    async onRemove() {}
    
    async patchMurderPlayer(murderer: PlayerData<Room>, victim: PlayerData<Room>) {
        const murdererPlayerControl = murderer.control;
        const victimPlayerControl = victim.control;
        if (murdererPlayerControl === undefined || victimPlayerControl === undefined)
            return;

        const victimPlayerId = victim.playerId;
        if (victimPlayerId === undefined)
            return;

        // this method is overridden to remove player.die event being called (via patchMurderPlayer),
        // see MouthwashApiPlugin.onPlayerDie
        // victim.control?.kill("murder");
        await murderer.emit(new PlayerMurderEvent(this.room, murderer, undefined, victim));
        murdererPlayerControl["_rpcMurderPlayer"](victim);
        murdererPlayerControl["_checkMurderEndGame"](victim);
    }

    async checkForAllInfectedEndGame(lastTarget: PlayerData<Room>) {
        const players = this.api.getEndgamePlayers();
        if (players.every(playerRole => playerRole instanceof Infected || playerRole.player === lastTarget)) {
            this.room.registerEndGameIntent(
                new EndGameIntent(
                    "crewmates infected",
                    GameOverReason.ImpostorByKill,
                    {
                        endGameScreen: new Map(players.map<[number, EndGameScreen]>(playerRole => {
                            if (playerRole instanceof Infected) {
                                return [
                                    playerRole.player.playerId!,
                                    {
                                        titleText: playerRole._totalInfections > 0 ? "Victory" : Palette.impostorRed.text("Defeat"),
                                        subtitleText: playerRole._totalInfections > 0
                                            ? `All ${uninfectedColor.text("Crewmates")} were infected`
                                            : `All ${uninfectedColor.text("Crewmates")} were infected, but you didn't pass on the infection`,
                                        backgroundColor: Palette.impostorRed,
                                        yourTeam: RoleAlignment.Impostor,
                                        winSound: WinSound.ImpostorWin,
                                        hasWon: playerRole._totalInfections > 0
                                    }
                                ];
                            } else {
                                return [
                                    playerRole.player.playerId!,
                                    {
                                        titleText: Palette.impostorRed.text("Defeat"),
                                        subtitleText: `All ${uninfectedColor.text("Crewmates")} were infected`,
                                        backgroundColor: Palette.impostorRed,
                                        yourTeam: RoleAlignment.Impostor,
                                        winSound: WinSound.ImpostorWin,
                                        hasWon: false
                                    }
                                ];
                            }
                        }))
                    }
                )
            );
            return true;
        }
        return false;
    }

    didInfectPlayers() {
        return this._totalInfections > 0;
    }
}