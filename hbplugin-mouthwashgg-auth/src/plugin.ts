import {
    Connection,
    HindenburgPlugin,
    Worker,
    WorkerPlugin
} from "@skeldjs/hindenburg";

import undici from "undici";
import dotenv from "dotenv";

dotenv.config();

export interface UserAccountModel {
    id: string;
    email: string;
    display_name: string;
    created_at: string;
    banned_until: string|null;
    muted_until: string|null;
    game_settings: any;
    cosmetic_hat: string;
    cosmetic_pet: string;
    cosmetic_skin: string;
    cosmetic_color: number;
    cosmetic_visor: string;
    cosmetic_nameplate: string;
}

export interface UserSessionModel {
    user_id: string;
    client_token: string;
    ip: string;
}

export interface BundleItemModel {
    id: string;
    name: string;
    among_us_id: string;
    resource_path: string;
    resource_id: number;
    asset_bundle_url: string;
    type: "HAT"|"PET";
}

export interface PerkModel {
    id: string;
    settings: any;
}
export type InternalUserInformationModel = UserAccountModel & {
    owned_cosmetics: BundleItemModel[];
    perks: PerkModel[];
}

export interface GenericCacheData<T> {
    expiresAt: number;
    data: T;
}

export type GenericResponse<T> = {
    success: true,
    data: T
} | {
    success: undefined;
    code: number;
    message: string;
    details: string;
}

export interface MouthwashAuthPluginConfig {
    baseUrl: string;
}

@HindenburgPlugin("hbplugin-mouthwashgg-auth", "1.0.0", "first")
export class MouthwashAuthPlugin extends WorkerPlugin {
    internalAccessKey: string;

    userCache: Map<string, GenericCacheData<InternalUserInformationModel>>;
    userOwnedItemsCache: Map<string, GenericCacheData<BundleItemModel[]>>;
    userPerksCache: Map<string, GenericCacheData<PerkModel[]>>;
    sessionCache: Map<string, GenericCacheData<UserSessionModel>>;

    connectionSessionCache: WeakMap<Connection, UserSessionModel>;
    connectionUserCache: WeakMap<Connection, InternalUserInformationModel>;

    constructor(
        public readonly worker: Worker,
        public readonly config: MouthwashAuthPluginConfig
    ) {
        super(worker, config);

        this.internalAccessKey = process.env.MWGG_ACCOUNT_SERVER_INTERNAL_ACCESS_KEY || "";

        this.userCache = new Map;
        this.userOwnedItemsCache = new Map;
        this.userPerksCache = new Map;
        this.sessionCache = new Map;

        this.connectionSessionCache = new WeakMap;
        this.connectionUserCache = new WeakMap;
    }

    onPluginLoad() {
        this.logger.info("Base accounts URL: %s", this.baseUrl);
    }

    private getCached<K, T>(cache: Map<T, GenericCacheData<K>>, key: T) {
        const cachedData = cache.get(key);
        if (!cachedData)
            return undefined;

        if (Date.now() > cachedData.expiresAt) {
            cache.delete(key);
            return undefined;
        }

        return cachedData.data;
    }

    private setCached<K, T>(cache: Map<T, GenericCacheData<K>>, key: T, data: K, expiry: number) {
        cache.set(key, {
            expiresAt: Date.now() + expiry * 1000,
            data
        });
    }

    get baseUrl() {
        return this.config.baseUrl || "http://127.0.0.1:8000";
    }

    async make<T>(method: "GET"|"POST"|"PUT"|"DELETE"|"PATCH", path: string, body?: any): Promise<GenericResponse<T>> {
        const res = await undici.request(this.baseUrl + path, {
            method,
            body: body ? JSON.stringify(body) : undefined,
            headers: {
                "Authorization": this.internalAccessKey
                    ? "Service " + this.internalAccessKey
                    : undefined,
                "Content-Type": "application/json"
            }
        });
        
        try {
            const json = await res.body.json() as GenericResponse<T>;
            if (res.statusCode >= 300) {
                this.logger.warn("%s %s: (%s)", method.toUpperCase(), path, res.statusCode);
                return {
                    success: undefined,
                    message: "",
                    code: res.statusCode,
                    details: ""
                };
            }
    
            return json;
        } catch (e: any) {
            this.logger.warn("%s %s: (%s)", method.toUpperCase(), path, e);
            return {
                success: undefined,
                message: "",
                code: res.statusCode,
                details: ""
            };
        }
    }

    async getUser(clientId: string, invalidateCache = false) {
        const cachedUser = this.getCached(this.userCache, clientId);
        if (cachedUser && !invalidateCache)
            return cachedUser;

        const res = await this.make<InternalUserInformationModel>("GET", "/api/v2/internal/users/" + clientId);
        if (res.success) {
            this.setCached(this.userCache, clientId, res.data, 3600);
            return res.data;
        }

        return undefined;
    }

    async getConnectionUser(connection: Connection, invalidateCache = false) {
        const cachedUser = this.connectionUserCache.get(connection);

        if (cachedUser && !invalidateCache)
            return cachedUser;

        const cachedSession = this.connectionSessionCache.get(connection);
        if (!cachedSession)
            return undefined;

        const user = await this.getUser(cachedSession.user_id, invalidateCache);
        if (!user) {
            return undefined;
        }

        this.connectionUserCache.set(connection, user);
        return user;
    }

    async getSession(clientId: string) {
        const cachedSession = this.getCached(this.sessionCache, clientId);

        if (cachedSession) {
            return cachedSession;
        }

        const res = await this.make<UserSessionModel>("GET", "/api/v2/internal/users/" + clientId + "/session");
        if (res.success) {
            this.setCached(this.sessionCache, clientId, res.data, 60);
            return res.data;
        }

        return undefined;
    }

    async updateUserSettings(clientId: string, gameSettings: any) {
        await this.make("PUT", "/api/v2/internal/users/" + clientId + "/game_settings", {
            game_settings: gameSettings
        });

        const cachedUser = this.getCached(this.userCache, clientId);
        if (cachedUser) {
            cachedUser.game_settings = gameSettings;
        }
    }

    async updateUserCosmetics(clientId: string, hatId: string, petId: string, skinId: string, colorId: number, visorId: string, nameplateId: string) {
        await this.make("PUT", "/api/v2/internal/users/" + clientId + "/cosmetics", {
            cosmetic_hat: hatId,
            cosmetic_pet: petId,
            cosmetic_skin: skinId,
            cosmetic_color: colorId,
            cosmetic_visor: visorId,
            cosmetic_nameplate: nameplateId
        });

        const cachedUser = this.getCached(this.userCache, clientId);
        if (cachedUser) {
            cachedUser.cosmetic_hat = hatId;
            cachedUser.cosmetic_pet = petId;
            cachedUser.cosmetic_skin = skinId;
        }
    }
}