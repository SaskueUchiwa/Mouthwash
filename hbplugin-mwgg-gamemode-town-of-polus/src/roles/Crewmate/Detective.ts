import {
    Color,
    ComponentSpawnData,
    Hat,
    HazelWriter,
    MeetingHudCloseEvent,
    Nameplate,
    Pet,
    PlayerData,
    PlayerDieEvent,
    PlayerMoveEvent,
    PlayerStartMeetingEvent,
    Room,
    RoomFixedUpdateEvent,
    Skin,
    SpawnMessage,
    SpawnType,
    Vector2,
    Visor
} from "@skeldjs/hindenburg";

import {
    AssetReference,
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
import { BooleanValue, GameOption, NumberValue, RGBA } from "mouthwash-types";

import { TownOfPolusOptionName } from "../../gamemode";

const detectiveColor = new RGBA(47, 86, 150, 255);

export const DetectiveOptionName = {
    DetectiveCooldown: `${detectiveColor.text("Detective")} Cooldown`,
    DetectiveTimeLimit: `${detectiveColor.text("Detective")} Time Limit`,
    DetectiveSeeColors: `${detectiveColor.text("Detective")} See Colors`
} as const;

export interface DetectiveRecordingFrame {
    lifecycleTime: number;
    playerId: number;
    playerColor: Color;
    position: Vector2;
}

@MouthwashRole("Detective", RoleAlignment.Crewmate, detectiveColor, EmojiService.getEmoji("detective"))
@RoleObjective("See the traces of players near your location")
@AnticheatExceptions([ InfractionName.ForbiddenRpcRepair, InfractionName.ForbiddenRpcCompleteTask ])
export class Detective extends Crewmate {
    static getGameOptions(gameOptions: Map<string, GameOption>) {
        const roleOptions = new Map<any, any>([]);

        const detectiveProbability = gameOptions.get(TownOfPolusOptionName.DetectiveProbability);
        if (detectiveProbability && detectiveProbability.getValue<NumberValue>().value > 0) {
            roleOptions.set(DetectiveOptionName.DetectiveCooldown, new RoleGameOption(DetectiveOptionName.DetectiveCooldown, new NumberValue(45, 2.5, 10, 60, false, "{0}s")));
            roleOptions.set(DetectiveOptionName.DetectiveTimeLimit, new RoleGameOption(DetectiveOptionName.DetectiveTimeLimit, new NumberValue(3, 1, 1, 10, false, "{0}s")));
            roleOptions.set(DetectiveOptionName.DetectiveSeeColors, new RoleGameOption(DetectiveOptionName.DetectiveSeeColors, new BooleanValue(false)));
        }

        return roleOptions as Map<string, RoleGameOption>;
    }

    private _playersRecording: DetectiveRecordingFrame[];
    private _playersRecordingStartFrame: number;
    private _roleLifecycleTimer: number;

    private _isPlayingBack: boolean;
    private _playersPlaybackFrame: number;
    private _playbackTimer: number;
    private _fakeDummyPlayers: PlayerData<Room>[];
    private _fakeDummyPlayersSet: Set<PlayerData<Room>>;

    private _investigateButton?: Button;

    private _detectiveCooldown: number;
    private _detectiveTimeLimit: number;
    private _detectiveSeeColors: boolean;

    constructor(
        public readonly player: PlayerData<Room>
    ) {
        super(player);

        this._playersRecording = [];
        this._playersRecordingStartFrame = 0;
        this._roleLifecycleTimer = 0;

        this._isPlayingBack = true;
        this._playersPlaybackFrame = 0;
        this._playbackTimer = 0;
        this._fakeDummyPlayers = [];
        this._fakeDummyPlayersSet = new Set;

        this._detectiveCooldown = this.api.gameOptions.gameOptions.get(DetectiveOptionName.DetectiveCooldown)?.getValue<NumberValue>().value || 45;
        this._detectiveTimeLimit = this.api.gameOptions.gameOptions.get(DetectiveOptionName.DetectiveTimeLimit)?.getValue<NumberValue>().value || 3;
        this._detectiveSeeColors = this.api.gameOptions.gameOptions.get(DetectiveOptionName.DetectiveSeeColors)?.getValue<BooleanValue>().enabled || false;
    }

    async onReady() {
        await this.spawnInvestigateButton();
    }

    async spawnInvestigateButton() {
        this._investigateButton = await this.spawnButton(
            "investigate-button",
            new AssetReference("PggResources/TownOfPolus", "Assets/Mods/TownOfPolus/Trace.png"),
            {
                maxTimer: this._detectiveCooldown,
                currentTime: this._detectiveCooldown,
                saturated: true
            }
        );

        this._investigateButton?.on("mwgg.button.click", ev => {
            if (!this._investigateButton || this._investigateButton.currentTime > 0 || this.player.playerInfo?.isDead)
                return;
            
            this.playbackRecording();
            this._investigateButton.setCurrentTime(this._investigateButton.maxTimer);
        });
    }

    async onRemove() {
        this._investigateButton?.destroy();
        this._playersRecording = [];
        this._playersRecordingStartFrame = 0;
    }

    async playbackRecording() {
        if (this._playersRecordingStartFrame > this._playersRecording.length - 1)
            return;

        for (const player of this._fakeDummyPlayers) {
            if (player) player.destroy();
        }

        // collect all players by their player id
        const players: PlayerData<Room>[] = [];
        for (let i = this._playersRecordingStartFrame; i < this._playersRecording.length; i++) {
            const frame = this._playersRecording[i];
            if (players[frame.playerId])
                continue;

            const fakePlayer = this.room.createFakePlayer(false, true, false, false); // dont broadcast, we only send these players to the detective

            if (fakePlayer.control) {
                fakePlayer.transform?.snapTo(frame.position);
                this.room.broadcast(
                    [
                        new SpawnMessage(
                            SpawnType.Player,
                            -2,
                            0,
                            fakePlayer.control.components.map((component) => {
                                const writer = HazelWriter.alloc(512);
                                writer.write(component, true);
                                writer.realloc(writer.cursor);

                                return new ComponentSpawnData(
                                    component.netId,
                                    writer.buffer
                                );
                            })
                        )
                    ],
                    undefined,
                    [ this.player ]
                );
                fakePlayer.control?.setName("???");
                fakePlayer.control?.setHat(Hat.NoHat);
                fakePlayer.control?.setColor(this._detectiveSeeColors ? frame.playerColor : Color.Gray);
                fakePlayer.control?.setSkin(Skin.None);
                fakePlayer.control?.setPet(Pet.EmptyPet);
                fakePlayer.control?.setVisor(Visor.EmptyVisor);
                fakePlayer.control?.setNameplate(Nameplate.NoPlate);
                // this.api.animationService.beginPlayerAnimation(fakePlayer, [
                //     new PlayerAnimationKeyframe(0, 10, { opacity: 0.6, hatOpacity: 0.6, skinOpacity: 0.6, petOpacity: 0.6, nameOpacity: 0.6 })
                // ], false);
            }
            players[frame.playerId] = fakePlayer;
        }

        this._fakeDummyPlayers = players;
        this._fakeDummyPlayersSet = new Set(this._fakeDummyPlayers);
        this._isPlayingBack = true;
        this._playbackTimer = this._playersRecording[this._playersRecordingStartFrame].lifecycleTime;
        this._playersPlaybackFrame = this._playersRecordingStartFrame;
    }

    @EventListener("player.startmeeting", ListenerType.Room)
    async onStartMeeting(ev: PlayerStartMeetingEvent<Room>) {
        this._isPlayingBack = false;
        this._playersRecording = [];
        this._playersRecordingStartFrame = 0;
        this._playersPlaybackFrame = 0;
        for (const player of this._fakeDummyPlayers) {
            if (player) player.destroy();
        }
    }

    @EventListener("meeting.close", ListenerType.Room)
    async onMeetingClose(ev: MeetingHudCloseEvent<Room>) {
        if (!this._investigateButton)
            return;

        this._investigateButton.setCurrentTime(this._investigateButton.maxTimer);
    }

    @EventListener("room.fixedupdate", ListenerType.Room)
    async onRoomFixedUpdate(ev: RoomFixedUpdateEvent<Room>) {
        if (this._isPlayingBack) {
            this._playbackTimer += ev.delta / 1000;
            while (this._playersPlaybackFrame < this._playersRecording.length) {
                const frame = this._playersRecording[this._playersPlaybackFrame];
                const fakePlayer = this._fakeDummyPlayers[frame.playerId];
                if (this._playbackTimer < frame.lifecycleTime || fakePlayer === undefined)
                    break;

                fakePlayer?.transform?.move(frame.position.x, frame.position.y);
                this._playersPlaybackFrame++;
            }
            if (this._playersPlaybackFrame > this._playersRecording.length - 1) {
                this._isPlayingBack = false;
                this._playersRecording = [];
                this._playersRecordingStartFrame = 0;
                this._playersPlaybackFrame = 0;

                console.log("destroying fake players..");
                for (const player of this._fakeDummyPlayers) {
                    if (player) player.destroy();
                }
                this._fakeDummyPlayers = [];
                this._fakeDummyPlayersSet = new Set;
            }
            return;
        }
        this._roleLifecycleTimer += ev.delta / 1000;
        while (this._playersRecordingStartFrame < this._playersRecording.length && this._playersRecording[this._playersRecordingStartFrame].lifecycleTime < this._roleLifecycleTimer - this._detectiveTimeLimit) {
            this._playersRecordingStartFrame++;
        }
    }

    @EventListener("player.die", ListenerType.Player)
    async onPlayerDie(ev: PlayerDieEvent<Room>) {
        this._investigateButton?.destroy();
        this._investigateButton = undefined;
    }

    @EventListener("player.move", ListenerType.Room)
    async onPlayerMove(ev: PlayerMoveEvent<Room>) {
        if (this._isPlayingBack || this._fakeDummyPlayersSet.has(ev.player) || !this.api.targettableService.isTargettable(ev.player))
            return;

        if (ev.player.playerId !== undefined) {
            this._playersRecording.push({
                lifecycleTime: this._roleLifecycleTimer,
                playerId: ev.player.playerId!,
                playerColor: ev.player.playerInfo?.defaultOutfit.color || Color.Red,
                position: ev.position
            });
        }
    }
}