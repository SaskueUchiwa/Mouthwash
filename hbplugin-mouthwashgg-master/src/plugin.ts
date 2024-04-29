import {
    HindenburgPlugin,
    WorkerPlugin,
    Worker,
    EventListener,
    WorkerBeforeJoinEvent,
    RoomBeforeCreateEvent,
    DisconnectReason,
    ReliablePacket,
    RedirectMessage,
    GameCode
} from "@skeldjs/hindenburg";

import * as ioredis from "ioredis";

export interface MouthwashggMasterPluginConfig {
    pullNodesInterval: number;
    nodeExpireTimeout: number;
}

export interface NodeInformation {
    nodeId: number;
    externalIp: string;
    port: number;
    numRooms: number;
    numConnections: number;
    recordedAt: number;
}

@HindenburgPlugin("hbplugin-mouthwashgg-master")
export class MouthwashggMasterPlugin extends WorkerPlugin {
    protected redisClient: ioredis.Redis;
    protected cachedNodes: Map<number, NodeInformation>;
    protected pullInterval: NodeJS.Timeout|undefined;

    constructor(public readonly worker: Worker, public config: MouthwashggMasterPluginConfig) {
        super(worker, config);

        const [ redisHostName, redisPort ] = (process.env.MWGG_MASTER_REDIS_HOST as string).split(":");
        this.redisClient = new ioredis.Redis(parseInt(redisPort) || 6379, redisHostName, {
            username: process.env.MWGG_MASTER_REDIS_USERNAME,
            password: process.env.MWGG_MASTER_REDIS_PASSWORD,
            lazyConnect: true
        });

        this.cachedNodes = new Map;
    }
    
    async onPluginLoad() {
        await this.redisClient.connect();
        this.logger.info("Connected to Redis database.");
        await this.pullNodesFromRedis();
        this.pullInterval = setInterval(async () => {
            await this.pullNodesFromRedis();
        }, this.config.pullNodesInterval);
    }

    async onPluginUnload() {
        await this.redisClient.quit();
        if (this.pullInterval !== undefined) {
            clearInterval(this.pullInterval);
        }
    }

    onConfigUpdate(oldConfig: any, newConfig: any) {
        if (oldConfig.checkForUpdatesInterval !== newConfig.checkForUpdatesInterval && this.pullInterval !== undefined) {
            clearInterval(this.pullInterval);
            this.pullInterval = setInterval(async () => {
                await this.pullNodesFromRedis();
            }, this.config.pullNodesInterval);
        }
    }

    async pullNodesFromRedis() {
        let cursor = 0;
        do {
            const [ cursorStr, nodeKeys ] = await this.redisClient.scan(0, "MATCH", "NODE:*");
            cursor = parseInt(cursorStr) || 0;

            if (nodeKeys.length > 0) {
                const allNodeKeyValues = await this.redisClient.mget(nodeKeys);
                for (const nodeKeyValue of allNodeKeyValues) {
                    if (nodeKeyValue === null) continue;
                    this.recordNodeInformation(nodeKeyValue);
                }
            }
        } while (cursor > 0);
    }

    protected recordNodeInformation(nodeKeyValue: string) {
        try {
            const json = JSON.parse(nodeKeyValue) as Omit<NodeInformation, "recordedAt">;
            this.cachedNodes.set(json.nodeId, { ...json, recordedAt: Date.now() });
            return json;
        } catch (e: any) {
            this.logger.warn("Failed to record node information '%s': %s", nodeKeyValue, e);
            return undefined;
        }
    }

    async getNodeInformation(nodeId: number) {
        const cachedNodeInfo = this.cachedNodes.get(nodeId);
        if (!cachedNodeInfo || cachedNodeInfo.recordedAt < Date.now() - this.config.nodeExpireTimeout) {
            const nodeKeyValue = await this.redisClient.get("NODE:" + nodeId);
            if (nodeKeyValue === null) {
                return undefined;
            }

            return this.recordNodeInformation(nodeKeyValue);
        }
        return cachedNodeInfo;
    }

    @EventListener("worker.beforejoin")
    async onBeforeJoin(ev: WorkerBeforeJoinEvent) {
        ev.cancel();

        const roomKeyValue = await this.redisClient.get("ROOM:" + GameCode.convertIntToString(ev.gameCode));
        if (roomKeyValue === null) {
            await ev.client.disconnect(DisconnectReason.GameNotFound);
            return;
        }

        try {
            const json = JSON.parse(roomKeyValue);
            const node = await this.getNodeInformation(json.nodeId);
            if (!node) {
                await ev.client.disconnect(DisconnectReason.Error);
                return;
            }
            this.logger.info("Redirected %s to %s:%s for existing lobby (node %s)", ev.client, node.externalIp, node.port, node.nodeId);
            await ev.client.sendPacket(new ReliablePacket(ev.client.getNextNonce(), [ new RedirectMessage(node.externalIp, node.port) ]));
        } catch (e: any) {
            this.logger.info("Failed to redirect client %s: %s", ev.client, e);
            await ev.client.disconnect(DisconnectReason.Error);
        }
    }

    @EventListener("room.beforecreate")
    async onBeforeCreate(ev: RoomBeforeCreateEvent) {
        ev.cancel();

        let minimumLoadScore = Infinity;
        let minimumLoadNode: NodeInformation|undefined = undefined;
        for (const [ , nodeInformation ] of this.cachedNodes) {
            const loadScore = nodeInformation.numRooms;
            if (loadScore < minimumLoadScore) {
                minimumLoadNode = nodeInformation;
                minimumLoadScore = loadScore;
            }
        }
        if (minimumLoadNode === undefined) {
            await ev.client.disconnect(DisconnectReason.ServerFull);
            return;
        }
        minimumLoadNode.numRooms++;
        minimumLoadNode.numConnections++;
        this.logger.info("Redirected %s to %s:%s for new lobby (node %s)", ev.client, minimumLoadNode.externalIp, minimumLoadNode.port, minimumLoadNode.nodeId);
        await ev.client.sendPacket(new ReliablePacket(ev.client.getNextNonce(), [ new RedirectMessage(minimumLoadNode.externalIp, minimumLoadNode.port) ]));
    }
}