import {
    EventListener,
    GameCode,
    HindenburgPlugin,
    PlayerData,
    Room,
    RoomCreateEvent,
    RoomDestroyEvent,
    Worker,
    WorkerPlugin
} from "@skeldjs/hindenburg";

import * as ioredis from "ioredis";
import pg from "pg";
import * as crypto from "crypto";

import dotenv from "dotenv";
dotenv.config();

import { MouthwashAuthPlugin } from "hbplugin-mouthwashgg-auth";
import { GamemodeGameEndEvent, GamemodeRolesAssignedEvent, MouthwashApiPlugin, RoleAlignment } from "hbplugin-mouthwashgg-api";

export interface MouthwashggMetricsPluginConfig {
    pushNodeInterval: number;
    nodeExpireTimeout: number;
}

@HindenburgPlugin("hbplugin-mouthwashgg-metrics")
export class MouthwashggMetricsPlugin extends WorkerPlugin {
    protected _authApi?: MouthwashAuthPlugin;
    protected _uploadLobbiesInterval: NodeJS.Timeout|undefined;
    
    postgresClient: pg.Client;
    redisClient: ioredis.Redis;

    lobbyIds: WeakMap<Room, string>;
    playerIds: WeakMap<PlayerData<Room>, string>;
    lobbyCurrentGameIds: WeakMap<Room, string>;
    
    constructor(public readonly worker: Worker, public readonly config: MouthwashggMetricsPluginConfig) {
        super(worker, config);

        const [ postgresHostName, postgresPort ] = (process.env.MWGG_METRICS_POSTGRES_HOST as string).split(":");
        this.postgresClient = new pg.Client({
            user: process.env.MWGG_METRICS_POSTGRES_USER,
            host: postgresHostName,
            port: parseInt(postgresPort),
            database: process.env.MWGG_METRICS_POSTGRES_DATABASE,
            password: process.env.MWGG_METRICS_POSTGRES_PASSWORD
        });
        
        const [ redisHostName, redisPort ] = (process.env.MWGG_METRICS_REDIS_HOST as string).split(":");
        this.redisClient = new ioredis.Redis(parseInt(redisPort) || 6379, redisHostName, {
            username: process.env.MWGG_METRICS_REDIS_USERNAME,
            password: process.env.MWGG_METRICS_REDIS_PASSWORD,
            lazyConnect: true
        });

        this.lobbyIds = new WeakMap;
        this.playerIds = new WeakMap;
        this.lobbyCurrentGameIds = new WeakMap;
    }
    
    get authApi() {
        this._authApi ??= this.worker.loadedPlugins.get("hbplugin-mouthwashgg-auth")?.pluginInstance as MouthwashAuthPlugin|undefined;
        return this._authApi;
    }

    async onPluginLoad() {
        await this.postgresClient.connect();
        await this.redisClient.connect();
        this.logger.info("Connected to Postgres and Redis database");
        
        await this.uploadAllRoomsToRedis();
        await this.uploadAllClientsToRedis();
        this._uploadLobbiesInterval = setInterval(async () => {
            await this.pushNodeInformation();
        }, this.config.pushNodeInterval);
    }

    async onPluginUnload() {
        await this.postgresClient.end();
        await this.redisClient.disconnect();
        if (this._uploadLobbiesInterval !== undefined) {
            clearInterval(this._uploadLobbiesInterval);
        }
    }

    onConfigUpdate(oldConfig: any, newConfig: any) {
        if (oldConfig.pushNodeInterval !== newConfig.pushNodeInterval && this._uploadLobbiesInterval !== undefined) {
            clearInterval(this._uploadLobbiesInterval);
            this._uploadLobbiesInterval = setInterval(async () => {
                await this.pushNodeInformation();
            }, this.config.pushNodeInterval);
        }
    }

    async pushNodeInformation() {
        await this.uploadAllRoomsToRedis();
        await this.uploadAllClientsToRedis();
        await this.redisClient.set(`NODE:${this.worker.config.nodeId}`, JSON.stringify({
            nodeId: this.worker.config.nodeId,
            externalIp: this.worker.config.socket.ip,
            port: this.worker.config.socket.port,
            numRooms: this.worker.rooms.size,
            numConnections: this.worker.connections.size
        }), "PX", this.config.nodeExpireTimeout);
    }

    async uploadAllRoomsToRedis() {
        if (!this.authApi)
            return;

        for (const [ , room ] of this.worker.rooms) {
            const lobbyId = this.lobbyIds.get(room);
            const gameCode = GameCode.convertIntToString(room.code);
            await this.redisClient.set(`ROOM:${gameCode}`, JSON.stringify({
                nodeId: this.worker.config.nodeId,
                gameCode,
                lobbyId
            }), "PX", this.config.nodeExpireTimeout);
        }
    }

    async uploadAllClientsToRedis() {
        if (!this.authApi)
            return;

        for (const [ , client ] of this.worker.connections) {
            const connectionUser = await this.authApi.getConnectionUser(client);
            if (!connectionUser)
                continue;

            await this.redisClient.set(`CLIENT:${connectionUser.id}[${this.worker.config.nodeId},${client.clientId}]`, JSON.stringify({
                userId: connectionUser.id,
                nodeId: this.worker.config.nodeId,
                clientId: client.clientId
            }), "PX", this.config.nodeExpireTimeout);
        }
    }

    @EventListener()
    async onRoomCreate(ev: RoomCreateEvent) {
        if (!this.authApi)
            return;

        const lobbyId = crypto.randomUUID();
        const connectionUser = ev.room.createdBy ? await this.authApi.getConnectionUser(ev.room.createdBy) : undefined;
        if (!connectionUser) {
            if (ev.room.createdBy) {
                this.logger.warn("Room %s created but could not get user (connection %s)", ev.room, ev.room.createdBy);
            } else {
                this.logger.warn("Room %s created but could not get user (no connection)", ev.room);
            }
            return;
        }

        const { rows: createdLobbies } = await this.postgresClient.query(`
            INSERT INTO lobby(id, creator_id, created_at, host_server_id, destroyed_at, game_code)
            VALUES($1, $2, NOW(), $3, NULL, $4)
            RETURNING *
        `, [ lobbyId, connectionUser.id, this.worker.config.nodeId, GameCode.convertIntToString(ev.room.code) ]);

        if (createdLobbies.length > 0) {
            this.lobbyIds.set(ev.room, lobbyId);
            this.logger.info("Lobby recorded for room %s (id %s, created by %s)", ev.room, lobbyId, connectionUser.display_name);
        } else {
            this.logger.warn("Failed to record lobby for room %s, no records updated", ev.room);
        }
    }

    @EventListener()
    async onRoomDestroy(ev: RoomDestroyEvent) {
        const lobbyId = this.lobbyIds.get(ev.room as Room);
        if (!lobbyId) {
            this.logger.warn("Room %s destroyed, but no lobby id was recorded for it", ev.room);
            return;
        }

        const { rows: updatedLobbies } = await this.postgresClient.query(`
            UPDATE lobby
            SET destroyed_at = NOW()
            WHERE id = $1
            RETURNING *
        `, [ lobbyId ]);

        if (updatedLobbies.length > 0) {
            this.logger.info("Lobby record updated for destroyed room %s (id %s)", ev.room, lobbyId);
        } else {
            this.logger.warn("Failed to record lobby for room %s, no records updated", ev.room);
        }
    }

    @EventListener()
    async onGameStarted(ev: GamemodeRolesAssignedEvent) {
        const lobbyId = this.lobbyIds.get(ev.room as Room);
        if (!lobbyId) {
            this.logger.warn("Game started in room %s, but no lobby id was recorded for it", ev.room);
            return;
        }

        const api = ev.room.loadedPlugins.get("hbplugin-mouthwashgg-api")?.pluginInstance as MouthwashApiPlugin;
        if (!api) {
            this.logger.warn("No API plugin available in room %s", ev.room);
            return;
        }

        const gameSettings: any = {};
        for (const [ gameOptionPath, gameOptionValue ] of api.gameOptions.cachedValues) {
            gameSettings[gameOptionPath] = gameOptionValue.toJSON();
        }

        const hostPlayer = ev.room.host;
        const hostConnection = hostPlayer ? ev.room.getConnection(ev.room.host) : undefined;
        const hostConnectionUser = hostConnection ? await this.authApi?.getConnectionUser(hostConnection) : undefined;

        const gameId = crypto.randomUUID();

        const { rows: createdGames } = await this.postgresClient.query(`
            INSERT INTO game(id, lobby_id, started_by, game_settings, started_at, ended_at)
            VALUES($1, $2, $3, $4, NOW(), NULL)
            RETURNING *
        `, [ gameId, lobbyId, hostConnectionUser ? hostConnectionUser.id : null, gameSettings ]);

        if (ev.room.connections.size > 0) {
            const userIds = [];
            const params = [];
            for (const [ , connection ] of ev.room.connections) {
                const connectionUser = await this.authApi?.getConnectionUser(connection);
                if (!connectionUser) {
                    this.logger.warn("No connection user for client %s in room %s", connection, ev.room);
                    continue;
                }
                const playerId = crypto.randomUUID();
                const player = ev.room.players.get(connection.clientId);
                if (!player) {
                    this.logger.warn("No player for client %s in room %s", connection, ev.room);
                    continue;
                }
                const role = api.roleService.getPlayerRole(player);
                if (player) {
                    this.playerIds.set(player, playerId);
                }
                userIds.push(connectionUser.id);
                params.push(playerId, gameId, connectionUser.id, null, role?.metadata.roleName || null,
                    player.playerInfo?.defaultOutfit.color || null, connectionUser.display_name || null, role ? RoleAlignment[role.metadata.alignment] : null);
            }
            await this.postgresClient.query(`
                INSERT INTO player(id, game_id, user_id, did_win, role_name, cosmetic_color, cosmetic_name, role_alignment)
                VALUES ${userIds.map((_, i) => `($${(i * 8) + 1}, $${(i * 8) + 2}, $${(i * 8) + 3}, $${(i * 8) + 4}, $${(i * 8) + 5}, $${(i * 8) + 6}, $${(i * 8) + 7}, $${(i * 8) + 8})`).join(",")}
                RETURNING *
            `, params);
        }

        this.lobbyCurrentGameIds.set(ev.room, gameId);

        if (createdGames.length > 0) {
            this.logger.info("Game record (id %s) created for room %s", gameId, ev.room);
        } else {
            this.logger.info("Failed to create game record for room %s", gameId, ev.room);
        }
    }

    @EventListener()
    async onGameEnded(ev: GamemodeGameEndEvent) {
        const lobbyId = this.lobbyIds.get(ev.room as Room);
        if (!lobbyId) {
            this.logger.warn("Game ended in room %s, but no lobby id was recorded for it", ev.room);
            return;
        }

        const gameId = this.lobbyCurrentGameIds.get(ev.room);
        if (!gameId) {
            this.logger.warn("Game ended in room %s, but no game id was recorded for it", ev.room);
            return;
        }

        const { rows: createdGames } = await this.postgresClient.query(`
            UPDATE game
            SET ended_at = NOW()
            WHERE id = $1
        `, [ gameId ]);

        const promises = [];
        for (const [ player, endGameScreen ] of ev.endGameScreens) {
            const playerId = this.playerIds.get(player);
            if (playerId === undefined) {
                this.logger.warn("Failed to update win record for %s, as they did not have an id (won? %s)", playerId, endGameScreen.hasWon);
                continue;
            }

            promises.push(this.postgresClient.query(`
                UPDATE player
                SET did_win = $2
                WHERE id = $1
            `, [ playerId, endGameScreen.hasWon ]));
        }
        await Promise.all(promises);

        if (createdGames.length > 0) {
            this.logger.info("Updated record for game ended (id %s) for room %s", gameId, ev.room);
        } else {
            this.logger.info("Failed to update record for game ended (id %s) for room %s", gameId, ev.room);
        }
        this.lobbyCurrentGameIds.delete(ev.room);
    }
}

