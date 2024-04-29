import * as crypto from "crypto";
import { AccountServer } from "../AccountServer";

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
}

export interface BundleWithPreview extends Bundle {
    preview_contents_url: string;
    preview_contents_hash: string;
    num_items: number;
}

export interface BundleItem {
    id: string;
    bundle_id: string;
    name: string;
    among_us_id: string;
    resource_path: number;
    type: "HAT"|"PET";
    resource_id: number;
}

export interface BundleOwnership {
    id: string;
    item_id: string|null;
    user_id: string;
    owned_at: Date;
    bundle_id: string|null;
}

export interface UserPerk {
    id: string;
    user_id: string;
    perk_id: string;
    perk_settings: any;
}

export interface UserPerkSettings {
    id: string;
    settings: any;
}

export class CosmeticsController {
    constructor(public readonly server: AccountServer) {}
    
    async getAllCosmeticItemsOwnedByUser(userId: string): Promise<(BundleItem & { asset_bundle_url: string; asset_bundle_hash: string; asset_bundle_base_resource_id: number; })[]> {
        const { rows: foundBundleItems } = await this.server.postgresClient.query(`
            SELECT bundle_item.*, asset_bundle.url as asset_bundle_url, asset_bundle.hash as asset_bundle_hash, bundle.base_resource_id as asset_bundle_base_resource_id
            FROM bundle_item
            LEFT JOIN bundle ON bundle.id = bundle_item.bundle_id
            LEFT JOIN asset_bundle ON asset_bundle.id = bundle.asset_bundle_id
            LEFT JOIN user_owned_item ON user_owned_item.item_id = bundle_item.id OR user_owned_item.bundle_id = bundle.id
            WHERE user_owned_item.user_id = $1
        `, [ userId ]);

        return foundBundleItems;
    }
    
    async getAllBundlesOwnedByUser(userId: string): Promise<(BundleWithPreview & { owned_at: Date; })[]> {
        const { rows: foundBundleItems } = await this.server.postgresClient.query(`
            SELECT bundle.*, user_owned_item.owned_at, asset_bundle.preview_contents_url, asset_bundle.preview_contents_hash, COUNT(bundle_item.id) AS num_items
            FROM bundle
            LEFT JOIN user_owned_item ON user_owned_item.bundle_id = bundle.id
            LEFT JOIN asset_bundle ON asset_bundle.id = bundle.asset_bundle_id
            JOIN bundle_item ON bundle_item.bundle_id = bundle.id
            WHERE user_owned_item.user_id = $1
            GROUP BY bundle.id, user_owned_item.owned_at, asset_bundle.preview_contents_url, asset_bundle.preview_contents_hash
        `, [ userId ]);

        return foundBundleItems;
    }

    async doesUserOwnBundle(userId: string, bundleId: string) {
        const ownedBundleIds = await this.server.postgresClient.query(`
            SELECT *
            FROM user_owned_item
            WHERE user_id = $1 AND bundle_Id = $2
        `, [ userId, bundleId ]);

        return ownedBundleIds.rowCount > 0;
    }

    async getUserPerks(userId: string) {
        const { rows: foundPerks } = await this.server.postgresClient.query(`
            SELECT *
            FROM user_perk
            WHERE user_id = $1
        `, [ userId ]);

        return foundPerks.map(perk => ({ id: perk.perk_id, settings: perk.perk_settings })) as UserPerkSettings[];
    }

    async setPlayerCosmetics(userId: string, hatId: string, petId: string, skinId: string, colorId: number, visorId: string, nameplateId: string) {
        const rowsUpdated = await this.server.postgresClient.query(`
            UPDATE users
            SET cosmetic_hat = $2, cosmetic_pet = $3, cosmetic_skin = $4, cosmetic_color = $5, cosmetic_visor = $6, cosmetic_nameplate = $7
            WHERE id = $1
            RETURNING *
        `, [ userId, hatId, petId, skinId, colorId, visorId, nameplateId ]);

        return rowsUpdated.rowCount > 0;
    }

    async getAvailableBundleById(bundleId: string) {
        const { rows: availableBundles } = await this.server.postgresClient.query(`
            SELECT *
            FROM bundle
            WHERE id = $1
        `, [ bundleId ]);
        
        return availableBundles[0] as Bundle|undefined;
    }

    async getAllAvailableBundles(textSearch: string, valuations: string[], featureTag: string): Promise<BundleWithPreview[]> {
        if (textSearch.length > 0) {
            const { rows: availableBundles } = await this.server.postgresClient.query(`
                SELECT bundle.*, asset_bundle.preview_contents_url, asset_bundle.preview_contents_hash, COUNT(bundle_item.id) AS num_items,
                    ts_rank(to_tsvector(bundle.name || ' ' || bundle.description || ' ' || bundle.tags), websearch_to_tsquery($1)) as rank
                FROM bundle
                LEFT JOIN asset_bundle ON asset_bundle.id = bundle.asset_bundle_id
                JOIN bundle_item ON bundle_item.bundle_id = bundle.id
                WHERE bundle.valuation = ANY ($2) AND (to_tsvector(bundle.name || ' ' || bundle.description || ' ' || bundle.tags) @@ websearch_to_tsquery($1)) AND bundle.feature_tags LIKE ('%' || $3 || '%')
                GROUP BY bundle.id, asset_bundle.preview_contents_url, asset_bundle.preview_contents_hash
                ORDER BY rank DESC;
            `, [ textSearch, valuations, featureTag ]);

            return availableBundles;
        } else {
            const { rows: availableBundles } = await this.server.postgresClient.query(`
                SELECT bundle.*, asset_bundle.preview_contents_url, asset_bundle.preview_contents_hash, COUNT(bundle_item.id) AS num_items
                FROM bundle
                LEFT JOIN asset_bundle ON asset_bundle.id = bundle.asset_bundle_id
                JOIN bundle_item ON bundle_item.bundle_id = bundle.id
                WHERE bundle.valuation = ANY ($1) AND bundle.feature_tags LIKE ('%' || $2 || '%')
                GROUP BY bundle.id, asset_bundle.preview_contents_url, asset_bundle.preview_contents_hash
            `, [ valuations, featureTag ]);

            return availableBundles;
        }
    }

    async addOwnedBundle(userId: string, bundleId: string) {
        const { rows: bundlesOwned } = await this.server.postgresClient.query(`
            INSERT INTO user_owned_item(id, item_id, user_id, owned_at, bundle_id)
            VALUES($1, NULL, $2, NOW(), $3)
            RETURNING *
        `, [ crypto.randomUUID(), userId, bundleId ]);

        return bundlesOwned[0] as BundleOwnership|undefined;
    }
}