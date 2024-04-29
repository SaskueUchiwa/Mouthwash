import { ClientDisconnectEvent, Connection, PlayerData, ReliablePacket } from "@skeldjs/hindenburg";
import { FetchResourceMessage, FetchResponseType, ResourceType } from "mouthwash-types";
import allSettled from "promise.allsettled";

import { ClientFetchResourceResponseEvent } from "../../events";
import { MouthwashApiPlugin } from "../../plugin";
import { AssetBundle, AssetReference } from "./AssetBundle";

export const AssetBundleIds = { // TODO: Move to database
    "PggResources/Global": "https://jhwupengaqaqjewreahz.supabase.co/storage/v1/object/public/MouthwashAssets/016c9f28-ed8f-49cd-b819-fa993e4e3267",
    "PggResources/TownOfPolus": "https://jhwupengaqaqjewreahz.supabase.co/storage/v1/object/public/MouthwashAssets/943eb535-3ba9-48b0-9470-80af80235842"
} as Record<string, string>;

export class AssetLoaderService {
    globalAssets?: AssetBundle;
    
    loadedBundles: WeakMap<Connection, Set<AssetBundle>>;
    waitingFor: WeakMap<Connection, Map<number, AssetBundle>>;

    constructor(
        public readonly plugin: MouthwashApiPlugin
    ) {
        this.loadedBundles = new WeakMap;
        this.waitingFor = new WeakMap;
    }

    async loadGlobalAsset() {
        this.globalAssets = await AssetBundle.loadFromUrl(AssetBundleIds["PggResources/Global"], false);
    }

    getLoadedBundles(connection: Connection) {
        const cachedLoaded = this.loadedBundles.get(connection);
        const loadedBundles = cachedLoaded || new Set;

        if (!cachedLoaded) {
            this.loadedBundles.set(connection, loadedBundles);
        }

        return loadedBundles;
    }

    getWaitingFor(connection: Connection) {
        const cachedWaitingFor = this.waitingFor.get(connection);
        const waitingFor: Map<number, AssetBundle> = cachedWaitingFor || new Map;

        if (!cachedWaitingFor) {
            this.waitingFor.set(connection, waitingFor);
        }

        return waitingFor;
    }

    async loadOnAll(assetBundle: AssetBundle) {
        const promises = [];
        for (const [ , connection ] of this.plugin.room.connections) {
            promises.push(this.assertLoaded(connection, assetBundle));
        }
        await Promise.all(promises);
    }

    async assertLoaded(connection: Connection, assetBundle: AssetBundle) {
        if (this.getLoadedBundles(connection).has(assetBundle))
            return;

        const waitingFor = this.getWaitingFor(connection);
        if (waitingFor.has(assetBundle.bundleId))
            return;

        await connection.sendPacket(
            new ReliablePacket(
                connection.getNextNonce(),
                [
                    new FetchResourceMessage(
                        assetBundle.bundleId,
                        assetBundle.url,
                        assetBundle.fileHash,
                        ResourceType.AssetBundle
                    )
                ]
            )
        );
        waitingFor.set(assetBundle.bundleId, assetBundle);
    }

    onLoaded(connection: Connection, assetBundle: AssetBundle) {
        const waitingFor = this.getWaitingFor(connection);
        waitingFor.delete(assetBundle.bundleId);

        if (waitingFor.size === 0) {
            this.waitingFor.delete(connection);
        }

        this.getLoadedBundles(connection).add(assetBundle);

        this.plugin.logger.info("Loaded asset bundle %s for %s",
            assetBundle.url, connection);
    }

    waitForLoaded(connection: Connection, assetBundle: AssetBundle, timeout = 60000) {
        if (this.getLoadedBundles(connection).has(assetBundle))
            return Promise.resolve();

        return new Promise<void>((resolve, reject) => {
            const plugin = this.plugin;

            const sleep = setTimeout(() => {
                reject(new Error("Asset bundle download timed out"));
                plugin.room.off("mwgg.client.fetchresponse", onFetchResponse);
                plugin.worker.off("client.disconnect", onClientDisconnect);
            }, timeout);
            
            function onFetchResponse(ev: ClientFetchResourceResponseEvent, removeListener: () => void) {
                if (ev.client === connection && ev.response.responseType === FetchResponseType.Ended && ev.resourceId === assetBundle.bundleId) {
                    clearTimeout(sleep);
                    removeListener();
                    plugin.worker.off("client.disconnect", onClientDisconnect);
                    resolve();
                }
            }

            function onClientDisconnect(ev: ClientDisconnectEvent, removeListener: () => void) {
                if (ev.client === connection) {
                    clearTimeout(sleep);
                    plugin.room.off("mwgg.client.fetchresponse", onFetchResponse);
                    removeListener();
                    reject(new Error("Client disconnected"));
                }
            }
    
            plugin.room.on("mwgg.client.fetchresponse", onFetchResponse);
            plugin.worker.on("client.disconnect", onClientDisconnect);
        });
    }

    async resolveAssetReference(assetRef: AssetReference) {
        const assetBundle = await AssetBundle.loadFromUrl(AssetBundleIds[assetRef.bundleLocation], false);
        const asset = assetBundle.getAssetSafe(assetRef.assetPath);

        const promises = [];
        const connections = [];
        for (const [ , connection ] of this.plugin.room.connections) {
            promises.push(this.assertLoaded(connection, assetBundle).then(() => this.waitForLoaded(connection, assetBundle)));
            connections.push(connection);
        }
        const results = await allSettled(promises);
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            if (result.status === "rejected") {
                this.plugin.logger.warn("Failed to load asset %s for %s: %s", assetRef.assetPath, connections[i], result.reason);
            }
        }
        
        return asset;
    }

    async resolveAssetReferenceFor(assetRef: AssetReference, setFor: PlayerData[]) {
        const assetBundle = await AssetBundle.loadFromUrl(AssetBundleIds[assetRef.bundleLocation], false);
        const asset = assetBundle.getAssetSafe(assetRef.assetPath);

        const connections = this.plugin.room.getRealConnections(setFor);

        if (!connections)
            return;

        const promises = [];
        for (const connection of connections) {
            promises.push(this.assertLoaded(connection, assetBundle).then(() => this.waitForLoaded(connection, assetBundle)));
        }
        const results = await allSettled(promises);
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            if (result.status === "rejected") {
                this.plugin.logger.warn("Failed to load asset %s for %s: %s", assetRef.assetPath, connections[i], result.reason);
            }
        }
        
        return asset;
    }
}