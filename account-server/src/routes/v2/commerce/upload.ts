import * as mediator from "mouthwash-mediator";
import * as undici from "undici";
import * as crypto from "crypto";
import * as ark from "arktype";
import * as express from "express";
import * as fs from "fs/promises";
import JSZip from "jszip";
import { BaseRoute } from "../../BaseRoute";
import { ForbiddenError, InvalidBodyError } from "../../../errors";
import { Bundle, BundleItem, StripeItem } from "../../../controllers";

const uploadCosmeticBundleBodyValidator = ark.scope({
    sprite_file_reference: {
        file: "string",
        pivot: {
            x: "number",
            y: "number"
        }
    },
    hat_asset_data_info: {
        type: "\"HAT\"",
        main: "string|null",
        back: "string|null",
        left_main: "string|null",
        left_back: "string|null",
        climb: "string|null",
        floor: "string|null",
        left_climb: "string|null",
        left_floor: "string|null",
        thumb: "string|null",
        product_id: "string",
        in_front: "boolean",
        use_player_color: "boolean",
        chip_offset: {
            x: "number",
            y: "number"
        }
    },
    asset_data_info: ["hat_asset_data_info", "&", {
        asset_bundle_path: "string"
    }],
    bundle_data_info: {
        file_uuid: "string",
        bundle_data_base_64: "string",
        bundle_assets_listing: "asset_data_info[]", 
        base_resource_id: "integer"
    }
}).compile();

const publishCosmeticBundleBodyValidator = ark.scope({
    item_valuation: "'GHOST'|'CREWMATE'|'IMPOSTOR'|'POLUS'",
    bundle_config: {
        id: "string",
        name: "string",
        thumbnail_url: "string",
        author_id: "string",
        base_resource_id: "integer",
        price_usd: "integer",
        file_uuid: "string",
        valuation: "item_valuation",
        tags: "string[]",
        description: "string",
        items: "item_config[]",
        feature_tags: "string[]"
    },
    item_config: {
        id: "string",
        name: "string",
        among_us_id: "string",
        resource_path: "string",
        type: "string",
        resource_id: "integer",
        valuation: "item_valuation"
    }
}).compile();

export class UploadRoute extends BaseRoute {
    async uploadFileToBucket(path: string, contents: Buffer, fileType: string) {
        if (!this.server.config.supabase)
            throw new mediator.InternalServerError(new Error("Supabase storage bucket not setup on server, set SUPABASE_BASE_API_URL"));

        await undici.request(this.server.config.supabase.base_api_url + "/storage/v1/object/" + path, {
            method: "DELETE",
            headers: {
                authorization: "Bearer " + this.server.config.supabase.service_role_token,
                "cache-control": "3600"
            }
        });

        await undici.request(this.server.config.supabase.base_api_url + "/storage/v1/object/" + path, {
            method: "POST",
            body: contents,
            headers: {
                authorization: "Bearer " + this.server.config.supabase.service_role_token,
                "cache-control": "3600",
                "content-type": fileType
            }
        });
    }

    @mediator.Endpoint(mediator.HttpMethod.POST, "/v2/commerce/upload")
    @mediator.Middleware(express.json({ limit: "10mb" }))
    async uploadCosmeticBundle(transaction: mediator.Transaction<{}>) {
        const session = await this.server.sessionsController.validateAuthorization(transaction);

        if (session.user_id !== "6a5b4f31-74f9-416c-8679-6a3f10b452f3")
            throw new ForbiddenError("User does not have commerce access");
        
        if (!this.server.config.supabase)
            throw new mediator.InternalServerError(new Error("Supabase storage bucket not setup on server, set SUPABASE_BASE_API_URL"));

        const { data, problems } = uploadCosmeticBundleBodyValidator.bundle_data_info(transaction.getBody());
        if (data === undefined) throw new InvalidBodyError(problems);
        const bundleData = Buffer.from(data.bundle_data_base_64, "base64");
        const hash = crypto.createHash("sha256").update(bundleData).digest("hex").toUpperCase();

        const bundleMeta: any = {
            assetBundleId: data.base_resource_id,
            hash,
            assets: []
        };

        const bundleAssetsZip = new JSZip();
        const assetMetadata = [];
        for (let i = 0; i < data.bundle_assets_listing.length; i++) {
            const bundleAsset = data.bundle_assets_listing[i];

            bundleMeta.assets.push({
                type: 0,
                path: bundleAsset.asset_bundle_path,
                details: null
            });

            if (bundleAsset.type === "HAT") {
                if (bundleAsset.main) bundleAssetsZip.file(`${i}/main.png`, Buffer.from(bundleAsset.main, "base64"));
                if (bundleAsset.back) bundleAssetsZip.file(`${i}/back.png`, Buffer.from(bundleAsset.back, "base64"));
                if (bundleAsset.left_main) bundleAssetsZip.file(`${i}/left_main.png`, Buffer.from(bundleAsset.left_main, "base64"));
                if (bundleAsset.left_back) bundleAssetsZip.file(`${i}/left_back.png`, Buffer.from(bundleAsset.left_back, "base64"));
                if (bundleAsset.climb) bundleAssetsZip.file(`${i}/climb.png`, Buffer.from(bundleAsset.climb, "base64"));
                if (bundleAsset.floor) bundleAssetsZip.file(`${i}/floor.png`, Buffer.from(bundleAsset.floor, "base64"));
                if (bundleAsset.left_climb) bundleAssetsZip.file(`${i}/left_climb.png`, Buffer.from(bundleAsset.left_climb, "base64"));
                if (bundleAsset.left_floor) bundleAssetsZip.file(`${i}/left_floor.png`, Buffer.from(bundleAsset.left_floor, "base64"));
                if (bundleAsset.thumb) bundleAssetsZip.file(`${i}/thumb.png`, Buffer.from(bundleAsset.thumb, "base64"));
                
                assetMetadata.push({
                    type: "HAT",
                    chip_offset: bundleAsset.chip_offset,
                    product_id: bundleAsset.product_id,
                    in_front: bundleAsset.in_front,
                    use_player_color: bundleAsset.use_player_color,
                    main: bundleAsset.main ? { file: "main.png", pivot: { x: 0, y: 0 } } : undefined,
                    back: bundleAsset.back ? { file: "back.png", pivot: { x: 0, y: 0 } } : undefined,
                    left_main: bundleAsset.left_main ? { file: "left_main.png", pivot: { x: 0, y: 0 } } : undefined,
                    left_back: bundleAsset.left_back ? { file: "left_back.png", pivot: { x: 0, y: 0 } } : undefined,
                    climb: bundleAsset.climb ? { file: "climb.png", pivot: { x: 0, y: 0 } } : undefined,
                    floor: bundleAsset.floor ? { file: "floor.png", pivot: { x: 0, y: 0 } } : undefined,
                    left_climb: bundleAsset.left_climb ? { file: "left_climb.png", pivot: { x: 0, y: 0 } } : undefined,
                    left_floor: bundleAsset.left_floor ? { file: "left_floor.png", pivot: { x: 0, y: 0 } } : undefined,
                    thumb: bundleAsset.thumb ? { file: "thumb.png", pivot: { x: 0, y: 0 } } : undefined
                });
            }
        }
        bundleAssetsZip.file("metadata.json", JSON.stringify({ assets: assetMetadata }));

        const spritesArchiveData = await bundleAssetsZip.generateAsync({ type: "nodebuffer" });
        const spritesArchiveHash = crypto.createHash("sha256").update(spritesArchiveData).digest("hex").toUpperCase();

        await this.uploadFileToBucket("MouthwashAssets/" + data.file_uuid + "-assets", spritesArchiveData, "application/octet-stream");
        await this.uploadFileToBucket("MouthwashAssets/" + data.file_uuid, bundleData, "application/octet-stream");
        await this.uploadFileToBucket("MouthwashAssets/" + data.file_uuid + ".sha256", Buffer.from(hash), "text/plain");
        await this.uploadFileToBucket("MouthwashAssets/" + data.file_uuid + ".json", Buffer.from(JSON.stringify(bundleMeta), "utf8"), "application/json");

        const { rows: existingBundles } = await this.server.postgresClient.query(`
            SELECT *
            FROM asset_bundle
            WHERE id = $1
        `, [ data.file_uuid ]);
        const existingBundle = existingBundles[0];

        const fileUrl = this.server.config.supabase.base_api_url + "/storage/v1/object/public/MouthwashAssets/" + data.file_uuid;
        if (existingBundle) {
            await this.server.postgresClient.query(`
                UPDATE asset_bundle
                SET url = $2, hash = $3, preview_contents_url = $4, preview_contents_hash = $5
                WHERE id = $1
            `, [ data.file_uuid, fileUrl, hash, fileUrl + "-assets", spritesArchiveHash ]);
        } else {
            await this.server.postgresClient.query(`
                INSERT INTO asset_bundle(id, url, hash, preview_contents_url, preview_contents_hash)
                VALUES ($1, $2, $3, $4, $5)
            `, [ data.file_uuid, fileUrl, hash, fileUrl + "-assets", spritesArchiveHash ]);
        }

        transaction.respondJson({});
    }
    
    @mediator.Endpoint(mediator.HttpMethod.POST, "/v2/commerce/publish")
    @mediator.Middleware(express.json())
    async publishCosmeticBundle(transaction: mediator.Transaction<{}>) {
        const session = await this.server.sessionsController.validateAuthorization(transaction);

        if (session.user_id !== "6a5b4f31-74f9-416c-8679-6a3f10b452f3")
            throw new ForbiddenError("User does not have commerce access");
        
        if (!this.server.config.supabase)
            throw new mediator.InternalServerError(new Error("Supabase storage bucket not setup on server, set SUPABASE_BASE_API_URL"));

        const { data, problems } = publishCosmeticBundleBodyValidator.bundle_config(transaction.getBody());
        if (data === undefined) throw new InvalidBodyError(problems);

        const { rows: existingBundles } = await this.server.postgresClient.query(`
            SELECT *
            FROM bundle
            WHERE id = $1
        `, [ data.id ]);
        const existingBundle: Bundle|undefined = existingBundles[0];
        if (existingBundle) {
            const { rows: bundleStripeItems } = await this.server.postgresClient.query(`
                SELECT *
                FROM stripe_item
                WHERE id = $1
            `, [ existingBundle.stripe_item_id ]);
            const bundleStripeItem = bundleStripeItems[0] as StripeItem;

            if (!bundleStripeItem) {
                const stripeProduct = await this.server.stripe?.products.create({
                    name: data.name,
                    description: data.description,
                    images: [ data.thumbnail_url ]
                });
                if (!stripeProduct)
                    throw new mediator.InternalServerError(new Error("Failed to create product with Stripe API"));

                const stripePrice = await this.server.stripe?.prices.create({
                    product: stripeProduct.id,
                    currency: "USD",
                    unit_amount: data.price_usd
                });
                if (!stripePrice)
                    throw new mediator.InternalServerError(new Error("Failed to create product price with Stripe API"));

                const { rows: createdStripeItems } = await this.server.postgresClient.query(`
                    INSERT INTO stripe_item(id, stripe_price_id, stripe_product_id)
                    VALUES ($1, $2, $3)
                    RETURNING *
                `, [ crypto.randomUUID(), stripePrice.id, stripeProduct.id ]);

                const createdStripeItem = createdStripeItems[0] as StripeItem|undefined;
                if (!createdStripeItem)
                    throw new mediator.InternalServerError(new Error("Failed to create Stripe item"));

                existingBundle.stripe_item_id = createdStripeItem.id;
            } else if (existingBundle.price_usd !== data.price_usd) {
                const stripePrice = await this.server.stripe?.prices.create({
                    product: bundleStripeItem.stripe_product_id,
                    currency: "USD",
                    unit_amount: data.price_usd
                });
                if (!stripePrice)
                    throw new mediator.InternalServerError(new Error("Failed to create product price with Stripe API"));
                await this.server.postgresClient.query(`
                    UPDATE stripe_item
                    SET stripe_price_id = $2
                    WHERE id = $1
                `, [ bundleStripeItem.id, stripePrice.id ])
            }

            await this.server.postgresClient.query(`
                UPDATE bundle
                SET name = $2, thumbnail_url = $3, author_id = $4, base_resource_id = $5, price_usd = $6, asset_bundle_id = $7, stripe_item_id = $8, valuation = $9, tags = $10, description = $11, feature_tags = $12
                WHERE id = $1
            `, [ existingBundle.id, data.name, data.thumbnail_url, data.author_id, data.base_resource_id, data.price_usd, data.file_uuid, existingBundle.stripe_item_id, data.valuation, data.tags.join(" "), data.description, data.feature_tags.join(",") ]);
        
            const { rows: existingBundleItems } = await this.server.postgresClient.query(`
                SELECT *
                FROM bundle_item
                WHERE bundle_id = $1
            `, [ existingBundle.id ]) as { rows: BundleItem[] };

            // diff items, add new ones, update existing ones, remove old ones
            for (const item of data.items) {
                const existingItem = existingBundleItems.find(existingItem => existingItem.id === item.id);
                if (existingItem) {
                    await this.server.postgresClient.query(`
                        UPDATE bundle_item
                        SET name = $2, among_us_id = $3, resource_path = $4, type = $5, resource_id = $6, valuation = $7
                        WHERE id = $1
                    `, [ item.id, item.name, item.among_us_id, item.resource_path, item.type, item.resource_id, item.valuation ]);
                } else {
                    await this.server.postgresClient.query(`
                        INSERT INTO bundle_item(id, name, bundle_id, among_us_id, resource_path, type, resource_id, valuation)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    `, [ crypto.randomUUID(), item.name, data.id, item.among_us_id, item.resource_path, item.type, item.resource_id, item.valuation ]);
                }
            }

            for (const existingItem of existingBundleItems) {
                const item = data.items.find(item => item.id === existingItem.id);
                if (!item) {
                    await this.server.postgresClient.query(`
                        DELETE
                        FROM bundle_item
                        WHERE id = $1
                    `, [ existingItem.id ]);
                }
            }
        } else {
            const { rows: createdStripeItems } = await this.server.postgresClient.query(`
                INSERT INTO stripe_item(id, stripe_price_id)
                VALUES ($1, $2)
                RETURNING *
            `, [ crypto.randomUUID(), "" /* stripe_price_id */ ]);
            const createdStripeItem = createdStripeItems[0] as StripeItem|undefined;
            if (!createdStripeItem) throw new mediator.InternalServerError(new Error("Failed to create Stripe price"));

            const { rows: createdBundles } = await this.server.postgresClient.query(`
                INSERT INTO bundle(id, name, thumbnail_url, author_id, base_resource_id, price_usd, added_at, asset_bundle_id, stripe_item_id, valuation, tags, description, feature_tags)
                VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9, $10, $11, $12)
                RETURNING *
            `, [ data.id, data.name, data.thumbnail_url, data.author_id, data.base_resource_id, data.price_usd, data.file_uuid, createdStripeItem.id, data.valuation, data.tags.join(" "), data.description, data.feature_tags.join(",") ]);
            const createdBundle = createdBundles[0] as Bundle|undefined;
            if (!createdBundle) throw new mediator.InternalServerError(new Error("Failed to create bundle"));
            
            for (const item of data.items) {
                await this.server.postgresClient.query(`
                    INSERT INTO bundle_item(id, name, bundle_id, among_us_id, resource_path, type, resource_id, valuation)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `, [ crypto.randomUUID(), item.name, data.id, item.among_us_id, item.resource_path, item.type, item.resource_id, item.valuation ]);
            }
        }
        transaction.respondJson({});
    }
}