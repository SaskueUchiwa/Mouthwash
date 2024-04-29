import * as unzipit from "unzipit";
import * as b64ab from "base64-arraybuffer";
import * as path from "@tauri-apps/api/path";
import * as fs from "@tauri-apps/api/fs";
import jsShaHashes from "js-sha256";
import type { AssetsListingMetadata, LoadedCosmeticImage, LoadedCosmeticImages, SpriteFileReference } from "./previewTypes";

async function fetchZip(bundleId: string, previewDlUrl: string, previewDlHash: string, doCache: boolean) {
    // const existingDataBase64 = localStorage.getItem("cache:" + bundleInfo.id);
    // if (existingDataBase64 !== null) {
    //     const existingData = b64ab.decode(existingDataBase64);
    //     const existingHash = jsShaHashes.sha256(existingData).toUpperCase();
    //     if (existingHash === bundleInfo.preview_contents_hash) {
    //         return existingData;
    //     }
    // }

    const bundlesPath = await path.join(await path.appDataDir(), "Cache");
    await fs.createDir(bundlesPath, { recursive: true });
    const cachedPath = await path.join(bundlesPath, bundleId);
    if (doCache && await fs.exists(cachedPath)) {
        const a = Date.now();
        const fileData = await fs.readBinaryFile(cachedPath);
        console.log("Took %sms to load file", Date.now() - a);
        const existingHash = jsShaHashes.sha256(fileData).toUpperCase();
        if (existingHash === previewDlHash) {
            return fileData.buffer;
        }
    }

    const d = Date.now();
    const res = await fetch(previewDlUrl);
    if (!res.ok) return undefined;

    const buffer = await res.arrayBuffer();
    console.log("Took %sms to fetch file", Date.now() - d);
    // localStorage.setItem("cache:" + bundleInfo.id, b64ab.encode(buffer));
    if (doCache) await fs.writeBinaryFile(cachedPath, buffer);
    
    return buffer;
}

async function loadCosmeticSpriteAsImage(entries: Record<string, unzipit.ZipEntry>, assetId: number, isOfficial: boolean, material: "default"|"player", spriteFileReference: SpriteFileReference|undefined|null): Promise<LoadedCosmeticImage|undefined> {
    if (spriteFileReference === undefined || spriteFileReference === null) return undefined;

    const spriteFileData = await entries[`${assetId}/${spriteFileReference.file}`]?.arrayBuffer();
    if (spriteFileData === undefined) return undefined;
    const spriteFileBase64 = b64ab.encode(spriteFileData);

    const img = new Image;
    img.src = "data:image/png;base64," + spriteFileBase64;
    return { img, material, pivot: spriteFileReference.pivot, scale: isOfficial ? 1 : 0.5 };
}

export async function getPreviewAssetsByUrl(bundleId: string, previewDlUrl: string, previewDlHash: string, doCache: boolean, isOfficial: boolean, loadMax: number|null) {
    console.log("Loading preview assets (bundle id %s, url %s, hash %s, caching %s)", bundleId, previewDlUrl, previewDlHash, doCache);
    const buf = await fetchZip(bundleId, previewDlUrl, previewDlHash, doCache);
    const { entries } = await unzipit.unzip(buf);
    const metadataFileText = await entries["metadata.json"].text();
    const metadata = JSON.parse(metadataFileText) as AssetsListingMetadata;

    const loadedCosmeticImages: LoadedCosmeticImages[] = [];
    let i = 0;
    for (; i < (loadMax !== null ? Math.min(loadMax, metadata.assets.length) : metadata.assets.length); i++) {
        const asset = metadata.assets[i];
        const material = asset.use_player_color ? "player" : "default";
        loadedCosmeticImages.push({
            asset,
            main: await loadCosmeticSpriteAsImage(entries, i, isOfficial, material, asset.main),
            back: await loadCosmeticSpriteAsImage(entries, i, isOfficial, material, asset.back),
            left_main: await loadCosmeticSpriteAsImage(entries, i, isOfficial, material, asset.left_main),
            left_back: await loadCosmeticSpriteAsImage(entries, i, isOfficial, material, asset.left_back),
            climb: await loadCosmeticSpriteAsImage(entries, i, isOfficial, material, asset.climb),
            floor: await loadCosmeticSpriteAsImage(entries, i, isOfficial, material, asset.floor),
            left_climb: await loadCosmeticSpriteAsImage(entries, i, isOfficial, material, asset.left_climb),
            left_floor: await loadCosmeticSpriteAsImage(entries, i, isOfficial, material, asset.left_floor),
            thumb: await loadCosmeticSpriteAsImage(entries, i, isOfficial, material, asset.thumb)
        });
    }
    return loadedCosmeticImages;
}