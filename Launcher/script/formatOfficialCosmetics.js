const sharp = require("sharp");
const fs = require("fs/promises");
const path = require("path");
const JSZip = require("jszip");

const BASE_PATH = path.join(__dirname, "../public/CosmeticOfficial");

/**
 * @param {JSZip} archive
 * @param {string} imagePath 
 * @param {{ x: number; y: number; }} pivot 
 * @param {{ x: number; y: number; }} pivotCentre 
 * @param {sharp.Metadata} referenceDimensions 
 */
async function formatImage(archive, imagePath, pivot, pivotCentre, referenceDimensions) {
    const imageSharp = sharp(await fs.readFile(path.join(BASE_PATH, imagePath)));
    const imageDimensions = await imageSharp.metadata();

    const resizedImage = imageSharp
        .extend({
            left: Math.floor((referenceDimensions.width - imageDimensions.width) / 2) + pivotCentre.x + Math.floor(imageDimensions.width / 2) - Math.floor(pivot.x),
            right: Math.ceil((referenceDimensions.width - imageDimensions.width) / 2) - pivotCentre.x - Math.floor(imageDimensions.width / 2) + Math.floor(pivot.x),
            top: Math.floor((referenceDimensions.height - imageDimensions.height) / 2) - pivotCentre.y - Math.floor(imageDimensions.height / 2) + Math.floor(pivot.y),
            bottom: Math.ceil((referenceDimensions.height - imageDimensions.height) / 2) + pivotCentre.y + Math.floor(imageDimensions.height / 2) - Math.floor(pivot.y),
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        });
    archive.file(imagePath.replace(/\\/g, "/"), await resizedImage.png().toBuffer());
    console.log("|- file (%s)", imagePath);
}

/**
 * @param {JSZip} archive
 * @param {string} baseAssetPath 
 * @param {any} assetMetadata 
 * @param {sharp.Metadata} referenceDimensions 
 */
async function formatHatCosmetic(archive, baseAssetPath, assetMetadata, referenceDimensions) {
    const pivotCentre = { x: -2, y: 8 };
    archive.folder(baseAssetPath);
    if (assetMetadata.main) await formatImage(archive, path.join(baseAssetPath, assetMetadata.main.file), assetMetadata.main.pivot, pivotCentre, referenceDimensions);
    if (assetMetadata.back) await formatImage(archive, path.join(baseAssetPath, assetMetadata.back.file), assetMetadata.back.pivot, pivotCentre, referenceDimensions);
    if (assetMetadata.left_main) await formatImage(archive, path.join(baseAssetPath, assetMetadata.left_main.file), assetMetadata.left_main.pivot, pivotCentre, referenceDimensions);
    if (assetMetadata.left_back) await formatImage(archive, path.join(baseAssetPath, assetMetadata.left_back.file), assetMetadata.left_back.pivot, pivotCentre, referenceDimensions);
    if (assetMetadata.climb) await formatImage(archive, path.join(baseAssetPath, assetMetadata.climb.file), assetMetadata.climb.pivot, pivotCentre, referenceDimensions);
    if (assetMetadata.floor) await formatImage(archive, path.join(baseAssetPath, assetMetadata.floor.file), assetMetadata.floor.pivot, pivotCentre, referenceDimensions);
    if (assetMetadata.left_climb) await formatImage(archive, path.join(baseAssetPath, assetMetadata.left_climb.file), assetMetadata.left_climb.pivot, pivotCentre, referenceDimensions);
    if (assetMetadata.left_floor) await formatImage(archive, path.join(baseAssetPath, assetMetadata.left_floor.file), assetMetadata.left_floor.pivot, pivotCentre, referenceDimensions);
    if (assetMetadata.thumb) await formatImage(archive, path.join(baseAssetPath, assetMetadata.thumb.file), assetMetadata.thumb.pivot, pivotCentre, referenceDimensions);
}

/**
 * @param {JSZip} archive
 * @param {string} baseAssetPath 
 * @param {any} assetMetadata 
 * @param {sharp.Metadata} referenceDimensions 
 */
async function formatSkinCosmetic(archive, baseAssetPath, assetMetadata, referenceDimensions) {
    const pivotCentre = { x: 0, y: -66 };
    archive.folder(baseAssetPath);
    if (assetMetadata.main) await formatImage(archive, path.join(baseAssetPath, assetMetadata.main.file), assetMetadata.main.pivot, pivotCentre, referenceDimensions);
    if (assetMetadata.back) await formatImage(archive, path.join(baseAssetPath, assetMetadata.back.file), assetMetadata.back.pivot, pivotCentre, referenceDimensions);
    if (assetMetadata.left_main) await formatImage(archive, path.join(baseAssetPath, assetMetadata.left_main.file), assetMetadata.left_main.pivot, pivotCentre, referenceDimensions);
    if (assetMetadata.left_back) await formatImage(archive, path.join(baseAssetPath, assetMetadata.left_back.file), assetMetadata.left_back.pivot, pivotCentre, referenceDimensions);
    if (assetMetadata.climb) await formatImage(archive, path.join(baseAssetPath, assetMetadata.climb.file), assetMetadata.climb.pivot, pivotCentre, referenceDimensions);
    if (assetMetadata.floor) await formatImage(archive, path.join(baseAssetPath, assetMetadata.floor.file), assetMetadata.floor.pivot, pivotCentre, referenceDimensions);
    if (assetMetadata.left_climb) await formatImage(archive, path.join(baseAssetPath, assetMetadata.left_climb.file), assetMetadata.left_climb.pivot, pivotCentre, referenceDimensions);
    if (assetMetadata.left_floor) await formatImage(archive, path.join(baseAssetPath, assetMetadata.left_floor.file), assetMetadata.left_floor.pivot, pivotCentre, referenceDimensions);
    if (assetMetadata.thumb) await formatImage(archive, path.join(baseAssetPath, assetMetadata.thumb.file), assetMetadata.thumb.pivot, pivotCentre, referenceDimensions);
}

/**
 * @param {JSZip} archive
 * @param {string} baseAssetPath 
 * @param {any} assetMetadata 
 * @param {sharp.Metadata} referenceDimensions 
 */
async function formatVisorCosmetic(archive, baseAssetPath, assetMetadata, referenceDimensions) {
    const pivotCentre = { x: 0, y: 0 };
    archive.folder(baseAssetPath);
    if (assetMetadata.main) await formatImage(archive, path.join(baseAssetPath, assetMetadata.main.file), assetMetadata.main.pivot, pivotCentre, referenceDimensions);
    if (assetMetadata.back) await formatImage(archive, path.join(baseAssetPath, assetMetadata.back.file), assetMetadata.back.pivot, pivotCentre, referenceDimensions);
    if (assetMetadata.left_main) await formatImage(archive, path.join(baseAssetPath, assetMetadata.left_main.file), assetMetadata.left_main.pivot, pivotCentre, referenceDimensions);
    if (assetMetadata.left_back) await formatImage(archive, path.join(baseAssetPath, assetMetadata.left_back.file), assetMetadata.left_back.pivot, pivotCentre, referenceDimensions);
    if (assetMetadata.climb) await formatImage(archive, path.join(baseAssetPath, assetMetadata.climb.file), assetMetadata.climb.pivot, pivotCentre, referenceDimensions);
    if (assetMetadata.floor) await formatImage(archive, path.join(baseAssetPath, assetMetadata.floor.file), assetMetadata.floor.pivot, pivotCentre, referenceDimensions);
    if (assetMetadata.left_climb) await formatImage(archive, path.join(baseAssetPath, assetMetadata.left_climb.file), assetMetadata.left_climb.pivot, pivotCentre, referenceDimensions);
    if (assetMetadata.left_floor) await formatImage(archive, path.join(baseAssetPath, assetMetadata.left_floor.file), assetMetadata.left_floor.pivot, pivotCentre, referenceDimensions);
    if (assetMetadata.thumb) await formatImage(archive, path.join(baseAssetPath, assetMetadata.thumb.file), assetMetadata.thumb.pivot, pivotCentre, referenceDimensions);
}

(async () => {
    const referenceImagePath = path.resolve(__dirname, "../public/Color_Rose.png");
    const referenceImageBytes = await fs.readFile(referenceImagePath);
    const referenceDimensions = await sharp(referenceImageBytes).metadata();

    const metadataFilePath = path.join(BASE_PATH, "metadata.json");
    const metadataFileText = await fs.readFile(metadataFilePath, "utf8");
    const metadataJson = JSON.parse(metadataFileText);

    const archive = new JSZip;

    for (let i = 0; i < metadataJson.assets.length; i++) {
        const assetMetadata = metadataJson.assets[i];
        const baseAssetPath = i.toString();

        if (assetMetadata.type === "HAT") {
            console.log("[#%s] Formatting %s (%s)", i.toString().padStart(3, "0"), assetMetadata.product_id, assetMetadata.type);
            try {
                await formatHatCosmetic(archive, baseAssetPath, assetMetadata, referenceDimensions);
            } catch (e) {
                console.log("|- FAILED");
                console.log(e.message);
            }
        } else if (assetMetadata.type === "SKIN") {
            console.log("[#%s] Formatting %s (%s)", i.toString().padStart(3, "0"), assetMetadata.product_id, assetMetadata.type);
            try {
                await formatSkinCosmetic(archive, baseAssetPath, assetMetadata, referenceDimensions);
            } catch (e) {
                console.log("|- FAILED");
                console.log(e.message);
            }
        } else if (assetMetadata.type === "VISOR") {
            console.log("[#%s] Formatting %s (%s)", i.toString().padStart(3, "0"), assetMetadata.product_id, assetMetadata.type);
            try {
                await formatVisorCosmetic(archive, baseAssetPath, assetMetadata, referenceDimensions);
            } catch (e) {
                console.log("|- FAILED");
                console.log(e.message);
            }
        }
    }

    archive.file("metadata.json", JSON.stringify(metadataJson));
    console.log("Generating archive..");
    await fs.writeFile(path.resolve(__dirname, "../public/CosmeticOfficial.zip"), await archive.generateAsync({ type: "nodebuffer" }));
})();