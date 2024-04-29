const path = require("path");
const fs = require("fs/promises");
const JSZip = require("jszip");
const crypto = require("crypto");
const dotenv = require("dotenv");
const child_process = require("child_process");
const { default: got } = require("got");

dotenv.config();

function runCommandInDir(dir, command) {
    return new Promise((resolve, reject) => {
        child_process.exec(command, {
            cwd: dir
        }, (err, stdout) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(stdout);
        });
    });
}

const baseMouthwashDllPath = path.join(__dirname, "../MouthwashClient/bin/Release/net6.0/MouthwashClient.dll");

/**
 * @typedef ChangelogEntry
 * @prop {string} version
 * @prop {string} date_released
 * @prop {number} release_download_bytes
 * @prop {string} release_download_sha256
 * @prop {string} release_url
 * @prop {string[]} notes
 */

(async () => {
    console.log("Fetching release version..");
    const releaseVersionTag = (await runCommandInDir(process.cwd(), `git describe --tags --abbrev=0`)).trim();
    const tagDescription = (await runCommandInDir(process.cwd(), `git for-each-ref refs/tags/${releaseVersionTag} --format='%(contents)'`)).replace(/(^')|('$)/g, "").trim();
    const releaseVersion = releaseVersionTag.replace("release/client/", "");
    console.log("|- Release version: %s", releaseVersion);
    console.log("|- Release description:");
    console.log("  |- " + tagDescription.split("\n").join("\n  |- "));

    console.log("Fetching bepinex BepInEx-Unity.IL2CPP-win-x86-6.0.0-be.688..");
    const bepinexInstallResponse = await got.get("https://builds.bepinex.dev/projects/bepinex_be/688/BepInEx-Unity.IL2CPP-win-x86-6.0.0-be.688%2B4901521.zip", {
        responseType: "buffer"
    });

    const bundleZip = new JSZip();
    console.log("|- Loading (%s MB)..", (bepinexInstallResponse.body.byteLength / 1024 / 1024).toFixed(2));
    await bundleZip.loadAsync(bepinexInstallResponse.body);

    console.log("|- Adding pgg-supported.dll..");
    const mouthwashClientData = await fs.readFile(baseMouthwashDllPath);
    bundleZip.file("BepInEx/plugins/pgg.dll", mouthwashClientData);
    console.log("|- Added pgg.dll (%s MB)", (mouthwashClientData.byteLength / 1024 / 1024).toFixed(2));

    console.log("|- Adding Reactor.dll..");
    const reactorClientResponse = await got.get("https://github.com/NuclearPowered/Reactor/releases/download/2.2.0/Reactor.dll", { responseType: "buffer" });
    bundleZip.file("BepInEx/plugins/Reactor.dll", reactorClientResponse.body);
    console.log("|- Added Reactor.dll (%s MB)", (reactorClientResponse.body.byteLength / 1024 / 1024).toFixed(2));

    console.log("|- Adding Utf8Json.dll..");
    const utf8JsonResponse = await got.get("https://jhwupengaqaqjewreahz.supabase.co/storage/v1/object/public/Downloads/Utf8Json.dll", { responseType: "buffer" });
    bundleZip.file("BepInEx/plugins/Utf8Json.dll", utf8JsonResponse.body);
    console.log("|- Added Ut8fJson.dll (%s MB)", (utf8JsonResponse.body.byteLength / 1024 / 1024).toFixed(2));
    
    console.log("|- Adding Submerged(New Version).dll..");
    const submergedResponse = await got.get("https://github.com/SubmergedAmongUs/Submerged/releases/download/v2024.3.25/Submerged.dll", { responseType: "buffer" });
    bundleZip.file("BepInEx/plugins/Submerged.dll", submergedResponse.body);
    console.log("|- Added Submerged.dll (%s MB)", (submergedResponse.body.byteLength / 1024 / 1024).toFixed(2));

    // console.log("|- Adding Submerged..");
    // const submergedResponse = await got.get("https://jhwupengaqaqjewreahz.supabase.co/storage/v1/object/public/Downloads/Submerged.dll", { responseType: "buffer" });
    // const submergedZip = new JSZip();
    // await submergedZip.loadAsync(submergedResponse.body);
    // for (const filePath in submergedZip.files) {
    //     const file = submergedZip.files[filePath];
    //     const data = await file.async();
    //     bundleZip.file(filePath, data);
    // }
    // console.log("|- Added Submerged files (%s MB)", (utf8JsonResponse.body.byteLength / 1024 / 1024).toFixed(2));

    console.log("|- Generating .zip..");
    const bundleFile = await bundleZip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    const numBytes = bundleFile.byteLength;

    if (process.argv.includes("--write") || process.argv.includes("-w")) {
        await fs.writeFile(path.join(process.cwd(), "bundle.zip"), bundleFile);
        return;
    }

    console.log("|- calculating hash (%s MB)..", (numBytes / 1024 / 1024).toFixed(3));
    const hash = crypto.createHash("sha256").update(bundleFile).digest("hex").toUpperCase();

    console.log("Uploading bundle to %s..", process.env.SUPABASE_BASE_API_URL + "/storage/v1/object/Downloads/" + releaseVersion + ".zip");
    try {
        console.log("|- Removing existing..");
        await got.delete(process.env.SUPABASE_BASE_API_URL + "/storage/v1/object/Downloads/" + releaseVersion + ".zip", {
            headers: {
                authorization: "Bearer " + process.env.SUPABASE_SERVICE_ROLE_TOKEN,
                "cache-control": "3600"
            },
            responseType: "json"
        });
    } catch (e) {
        console.log("|- Existing does not exist, continuing..");
    }
    console.log("|- Uploading new..");
    await got.post(process.env.SUPABASE_BASE_API_URL + "/storage/v1/object/Downloads/" + releaseVersion + ".zip", {
        body: bundleFile,
        headers: {
            authorization: "Bearer " + process.env.SUPABASE_SERVICE_ROLE_TOKEN,
            "cache-control": "3600",
            "content-type": "application/octet-stream"
        }
    });

    console.log("Fetching changelog..");
    /** @type {ChangelogEntry[]} */
    let remoteChangelog = [];
    try {
        await got.get(process.env.SUPABASE_BASE_API_URL + "/storage/v1/object/Downloads/changelog.json", {
            headers: {
                authorization: "Bearer " + process.env.SUPABASE_SERVICE_ROLE_TOKEN,
                "cache-control": "3600"
            },
            responseType: "json"
        });
    } catch (e) {
        console.log("|- Changelog does not exist, continuing..");
    }

    /** @type {ChangelogEntry} */
    const changeLogEntry = {
        version: releaseVersion,
        date_released: new Date().toISOString(),
        release_download_bytes: numBytes,
        release_download_sha256: hash,
        release_url: process.env.SUPABASE_BASE_API_URL + "/storage/v1/object/public/Downloads/" + releaseVersion + ".zip",
        notes: tagDescription.split("\n").filter(Boolean)
    };

    const existingIdx = remoteChangelog.findIndex(e => e.version === releaseVersion);
    if (existingIdx > -1) {
        remoteChangelog[existingIdx] = changeLogEntry;
    } else {
        remoteChangelog.unshift(changeLogEntry);
    }

    console.log("|- Replacing remote changelog..");
    try {
        await got.delete(process.env.SUPABASE_BASE_API_URL + "/storage/v1/object/Downloads/changelog.json", {
            headers: {
                authorization: "Bearer " + process.env.SUPABASE_SERVICE_ROLE_TOKEN,
                "cache-control": "3600"
            },
            responseType: "json"
        });
    } catch (e) {}

    await got.post(process.env.SUPABASE_BASE_API_URL + "/storage/v1/object/Downloads/changelog.json", {
        body: JSON.stringify(remoteChangelog),
        headers: {
            authorization: "Bearer " + process.env.SUPABASE_SERVICE_ROLE_TOKEN,
            "cache-control": "3600",
            "content-type": "application/json"
        },
        responseType: "json"
    });
    
    console.log("Done!");
})();