type DeclareSafeKeysImpl<Obj extends Record<string, any>, Keys extends string> = {
    [K in Keys]: Obj[K];
} & {
    [K in keyof Omit<Obj, Keys>]: undefined|never;
}

export type DeclareSafeKeys<Obj extends Record<string, any>, Keys extends string> = {
    [K in keyof DeclareSafeKeysImpl<Obj, Keys>]: DeclareSafeKeysImpl<Obj, Keys>[K];
}