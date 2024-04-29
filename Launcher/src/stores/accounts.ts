import { writable } from "svelte/store";

export const loading = Symbol("loading");
export const unavailable = Symbol("unavailable");
export const accountUrl = writable("https://urban-space-fortnight-jjr4gjwpjpr63p9r9-8000.app.github.dev:8000");

export interface UserLogin {
    id: string;
    email: string;
    created_at: string;
    banned_until: string;
    muted_until: string;
    email_verified: boolean;
    display_name: string;
    client_token: string;
    logged_in_at: string;
    cosmetic_hat: string;
    cosmetic_pet: string;
    cosmetic_skin: string;
    cosmetic_color: number;
    cosmetic_visor: string;
    cosmetic_nameplate: string;
    bundle_previews: { id: string; url: string; hash: string; }[];
}

export interface GameLobbyInfo {
    id: string;
    lobby_id: string;
    started_by: string;
    game_settings: any;
    started_at: string;
    ended_at: string|null;
    total_players: number|undefined;
    game_code: string;
    lobby_destroyed_at: string|null;
    did_win: boolean|null;
}

export interface Player {
    id: string;
    lobby_id: string;
    user_id: string;
    did_win: boolean|null|undefined;
    role_name: string|null|undefined;
    cosmetic_color: number|null;
    cosmetic_name: string|null;
    role_alignment: string|null;
}

export interface Bundle {
    id: string;
    name: string;
    thumbnail_url: string;
    author_id: string;
    base_resource_id: number;
    price_usd: number;
    added_at: Date;
    asset_bundle_id: string;
    stripe_item_id: string;
    valuation: string;
    tags: string;
    description: string;
    feature_tags: string;
    preview_contents_url: string;
    preview_contents_hash: string;
    num_items: number;
}

export type Deferred<T> = T|typeof loading|typeof unavailable;

export const user = writable<Deferred<UserLogin>>(loading);