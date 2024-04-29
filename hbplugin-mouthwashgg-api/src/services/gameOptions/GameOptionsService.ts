import { Connection } from "@skeldjs/hindenburg";

import {
    GameOption,
    SetGameOptionMessage,
    DeleteGameOptionMessage,
    AnyGameOptionType,
    MouthwashRootMessageTag,
    Palette,
    BooleanValue,
    NumberValue,
    EnumValue,
    GameOptionType
} from "mouthwash-types";

import { chunkArr } from "../../util/chunkArr";
import { MouthwashUpdateGameOptionEvent } from "../../events";
import { MouthwashApiPlugin } from "../../plugin";

export enum DefaultRoomCategoryName {
    None = "",
    Meetings = "Meeting Settings",
    Roles = "Role Settings",
    Tasks = "Task Settings",
    CrewmateRoles = "Crewmate Roles",
    NeutralRoles = "Neutral Roles",
    ImpostorRoles = "Impostor Roles",
    Config = "Config"
}

export const DefaultRoomOptionName = {
    Gamemode: "Gamemode",
    Map: "Map",
    ImpostorCount: "Impostor Count",
    MaxPlayerCount: "Max Player Count",
    EmergencyMeetings: "Emergency Meetings",
    EmergencyCooldown: "Emergency Cooldown",
    DiscussionTime: "Discussion Time",
    VotingTime: "Voting Time",
    AnonymousVotes: "Anonymous Votes",
    ConfirmEjects: "Confirm Ejects",
    PlayerSpeed: "Player Speed",
    CrewmateVision: `${Palette.crewmateBlue.text("Crewmate")} Vision`,
    ImpostorVision: `${Palette.impostorRed.text("Impostor")} Vision`,
    ImpostorKillCooldown: `${Palette.impostorRed.text("Impostor")} Kill Cooldown`,
    ImpostorKillDistance: `${Palette.impostorRed.text("Impostor")} Kill Distance`,
    CommonTasks: "Common Tasks",
    LongTasks: "Long Tasks",
    ShortTasks: "Short Tasks",
    VisualTasks: "Visual Tasks",
    TaskBarUpdates: "Task Bar Updates"
} as const;

export type AnyMap = "The Skeld"|"Polus"|"Mira HQ"|"Airship"|"Submerged";
export type AnyKillDistance = "Really Short"|"Short"|"Medium"|"Long";
export type AnyTaskbarUpdate = "Always"|"Meetings"|"Never";

export class GameOptionsService {
    updateQueue: Map<number, SetGameOptionMessage|DeleteGameOptionMessage>;
    gameOptions: Map<string, GameOption>;

    cachedValues: Map<string, AnyGameOptionType>;

    constructor(
        public readonly plugin: MouthwashApiPlugin
    ) {
        this.updateQueue = new Map;
        this.gameOptions = new Map;
        
        this.cachedValues = new Map;
    }

    getCachedValue(option: GameOption) {
        return this.cachedValues.get(option.category + "." + option.key);
    }

    updateCachedValue(option: GameOption, value: AnyGameOptionType) {
        this.cachedValues.set(option.category + "." + option.key, value);
    }

    updateOptionValue(option: GameOption, cachedValue: AnyGameOptionType) {
        if (cachedValue.optionType === GameOptionType.Boolean) {
            const existingOption = option.getValue<BooleanValue>();
            if (existingOption.optionType === GameOptionType.Boolean) {
                option.setValue(cachedValue);
            }
        } else if (cachedValue.optionType === GameOptionType.Enum) {
            const existingOption = option.getValue<EnumValue<string>>();
            if (existingOption.optionType === GameOptionType.Enum) {
                const selectedIdx = cachedValue.selectedIdx < 0
                    ? 0
                    : cachedValue.selectedIdx >= existingOption.options.length
                        ? existingOption.options.length - 1
                        : cachedValue.selectedIdx;
                option.setValue(new EnumValue(existingOption.options, selectedIdx));
            }
        } else if (cachedValue.optionType === GameOptionType.Number) {
            const existingOption = option.getValue<NumberValue>();
            if (existingOption.optionType === GameOptionType.Number) {
                const value = cachedValue.value < existingOption.lower
                    ? existingOption.lower
                    : cachedValue.value > existingOption.upper
                        ? existingOption.upper
                        : cachedValue.value;
                option.setValue(new NumberValue(value, existingOption.step, existingOption.lower, existingOption.upper, existingOption.zeroIsInfinity, existingOption.suffix));
            }
        }
    }

    updateOptionFromCache(option: GameOption) {
        const cachedValue = this.getCachedValue(option);
        if (cachedValue) {
            this.updateOptionValue(option, cachedValue);
        }
    }

    async createOptionWithCache(option: GameOption) {
        this.updateOptionFromCache(option);

        this.gameOptions.set(option.key, option);
        await this.plugin.room.broadcast([], [
            new SetGameOptionMessage(
                0,
                option
            )
        ]);

        return option;
    }

    async setOption(key: string, value: AnyGameOptionType, validate = false) {
        const gameOption = this.gameOptions.get(key) as GameOption;

        if (!gameOption)
            throw new Error("Game option with key '" + key + "' not declared");

        const oldValue = gameOption.getValue();

        gameOption.setValue(value, validate);
        this.updateCachedValue(gameOption, value);
        await this.plugin.room.broadcast([], [
            new SetGameOptionMessage(
                0,
                gameOption
            )
        ]);
        await this.plugin.room.emit(
            new MouthwashUpdateGameOptionEvent(
                this.plugin.room,
                this,
                gameOption.key,
                oldValue,
                gameOption.getValue()
            )
        );
    }

    async deleteOption(key: string) {
        const gameOption = this.gameOptions.get(key);

        if (!gameOption)
            return;

        this.gameOptions.delete(key);
        await this.plugin.room.broadcast([], [
            new DeleteGameOptionMessage(
                0,
                gameOption.key
            )
        ]);
    }

    async handleSetOption(message: SetGameOptionMessage, connection: Connection) {
        const gameOption = this.gameOptions.get(message.option.key);

        if (!gameOption)
            return;

        const oldValue = gameOption.getValue();

        try {
            gameOption.setValue(message.option.getValue(), true);
            this.updateCachedValue(gameOption, message.option.getValue());
            const ev = await this.plugin.room.emit(
                new MouthwashUpdateGameOptionEvent(
                    this.plugin.room,
                    this,
                    gameOption.key,
                    oldValue,
                    gameOption.getValue()
                )
            );
            if (ev.reverted) {
                gameOption.setValue(oldValue);
                this.updateCachedValue(gameOption, message.option.getValue());
                connection.room?.broadcastMessages([ ], [
                    new SetGameOptionMessage(
                        0,
                        gameOption
                    )
                ], [ connection ]);
            } else {
                connection.room?.broadcastMessages([], [ message ], undefined, [ connection ]);
            }
        } catch (e) {
            this.plugin.logger.error("Error handling set option", e);
        }
    }

    async handleDeleteOption(message: DeleteGameOptionMessage, connection: Connection) {
        this.gameOptions.delete(message.optionKey);
        connection.room?.broadcastMessages([], [ message ], undefined, [ connection ]);
    }

    async handleMessage(message: DeleteGameOptionMessage|SetGameOptionMessage, connection: Connection) {
        switch (message.messageTag) {
            case MouthwashRootMessageTag.SetGameOption:
                await this.handleSetOption(message, connection);
                break;
            case MouthwashRootMessageTag.DeleteGameOption:
                await this.handleDeleteOption(message, connection);
                break;
        }
    }
    
    getOptionDiff(other: Map<string, GameOption>) {
        const diff = [];

        for (const [ , option ] of this.gameOptions) {
            if (option.key === DefaultRoomOptionName.Gamemode)
                continue;

            if (!other.has(option.key)) {
                diff.push(new DeleteGameOptionMessage(0, option.key));
            }
        }

        for (const [ , option ] of other) {
            const myOption = this.gameOptions.get(option.key);
            if (myOption && myOption.compare(option))
                continue;

            diff.push(new SetGameOptionMessage(0, option));
        }

        return diff;
    }

    async transitionTo(options: Map<string, GameOption>): Promise<boolean> {
        const diffOptions = this.getOptionDiff(options);

        for (const message of diffOptions) {
            if (message.messageTag === MouthwashRootMessageTag.SetGameOption) {
                this.gameOptions.set(message.option.key, message.option);
                const cachedValue = this.getCachedValue(message.option);
                try {
                    if (cachedValue) {
                        this.updateOptionValue(message.option, cachedValue);
                    } else {
                        this.updateCachedValue(message.option, message.option.getValue());
                    }
                } catch (e: any) {
                    this.plugin.logger.warn("Error updating option: %s", e);
                }
                try {
                    if (!cachedValue) {
                    }
                } catch (e) {}
            } else if (message.messageTag === MouthwashRootMessageTag.DeleteGameOption) {
                this.gameOptions.delete(message.optionKey);
            }
        }

        if (diffOptions.length > 0) {
            const chunkedArr = chunkArr(diffOptions, 8);
            for (const messageChunk of chunkedArr) {
                await this.plugin.room.broadcast([], messageChunk);
            }
            return true;
        }
        return false;
    }

    async syncFor(connections: Connection[]) {
        const diffOptions = [];

        for (const [ , option ] of this.gameOptions) {
            diffOptions.push(new SetGameOptionMessage(0, option)); // this could be better & check for differences but it doesn't rly matter
        }
        
        const chunkedArr = chunkArr(diffOptions, 8);
        for (const messageChunk of chunkedArr) {
            await this.plugin.room.broadcastMessages([], messageChunk, connections);
        }
    }
}