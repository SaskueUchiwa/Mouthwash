export class Emoji {
    constructor(
        public readonly name: string,
        public readonly sprite: number
    ) {}

    toString() {
        return "<sprite index=" + this.sprite + ">";
    }
}

const emojis = [
    "crewmate", "crewalign", "neutalign", "impoalign", "partner", "skeld", "submerged", "mira",
    "impostor", "grenadier", "jester", "engineer", "polus", "morphling", "airship", "poisoner",
    "oracle", "phantom", "serialkiller", "snitch", "platItch", "platGoogle", "platSteam", "platEpic",
    "sheriff", "impervious", "locksmith", "swooper", "platIOS", "platUnknown", "mentor", "identitythief",
    "detective"
] as const;

const emojisMap = new Map(emojis.map((e, i) => [ e, new Emoji(e, i) ]));

export class EmojiService {
    static getEmoji(name: typeof emojis[number]) {
        return emojisMap.get(name)!;
    }
}