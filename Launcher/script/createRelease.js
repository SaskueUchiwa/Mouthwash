const path = require("path");
const fs = require("fs/promises");
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
    const releaseVersion = releaseVersionTag.replace("release/launcher/", "");
    console.log("|- Release version: %s", releaseVersion);
    console.log("|- Release description:");
    console.log("  |- " + tagDescription.split("\n").join("\n  |- "));

    const basePggRewrittenMsiPath = path.join(__dirname, `../src-tauri/target/release/bundle/msi/PGG Rewritten_${releaseVersion}_x64_en-US.msi`);
    const basePggRewrittenZipPath = path.join(__dirname, `../src-tauri/target/release/bundle/msi/PGG Rewritten_${releaseVersion}_x64_en-US.msi.zip`);
    const basePggRewrittenSigPath = basePggRewrittenZipPath + ".sig";

    const signatureBase64 = await fs.readFile(basePggRewrittenSigPath, "utf8");

    console.log("Uploading zip to %s..", `${process.env.SUPABASE_BASE_API_URL}/storage/v1/object/Downloads/Polus.GG Rewritten ${releaseVersion}.zip`);
    try {
        console.log("|- Removing existing..");
        await got.delete(`${process.env.SUPABASE_BASE_API_URL}/storage/v1/object/Downloads/Polus.GG Rewritten ${releaseVersion}.zip`, {
            headers: {
                authorization: "Bearer " + process.env.SUPABASE_SERVICE_ROLE_TOKEN,
                "cache-control": "3600"
            },
            responseType: "json"
        });
        await got.delete(`${process.env.SUPABASE_BASE_API_URL}/storage/v1/object/Downloads/Polus.GG Rewritten ${releaseVersion}.msi`, {
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
    await got.post(`${process.env.SUPABASE_BASE_API_URL}/storage/v1/object/Downloads/Polus.GG Rewritten ${releaseVersion}.zip`, {
        body: await fs.readFile(basePggRewrittenZipPath),
        headers: {
            authorization: "Bearer " + process.env.SUPABASE_SERVICE_ROLE_TOKEN,
            "cache-control": "3600",
            "content-type": "application/octet-stream"
        }
    });
    await got.post(`${process.env.SUPABASE_BASE_API_URL}/storage/v1/object/Downloads/Polus.GG Rewritten ${releaseVersion}.msi`, {
        body: await fs.readFile(basePggRewrittenMsiPath),
        headers: {
            authorization: "Bearer " + process.env.SUPABASE_SERVICE_ROLE_TOKEN,
            "cache-control": "3600",
            "content-type": "application/octet-stream"
        }
    });

    const launcherReleaseInfo = {
        version: releaseVersion,
        notes: tagDescription,
        pub_date: new Date().toISOString(),
        platforms: {
            "windows-x86_64": {
                signature: signatureBase64,
                url: `${process.env.SUPABASE_BASE_API_URL}/storage/v1/object/public/Downloads/Polus.GG Rewritten ${releaseVersion}.zip`
            }
        }
    };

    console.log("Replacing launcher release info..");
    try {
        await got.delete(`${process.env.SUPABASE_BASE_API_URL}/storage/v1/object/Downloads/launcher-release.json`, {
            headers: {
                authorization: "Bearer " + process.env.SUPABASE_SERVICE_ROLE_TOKEN,
                "cache-control": "3600"
            },
            responseType: "json"
        });
    } catch (e) { }
    
    await got.post(`${process.env.SUPABASE_BASE_API_URL}/storage/v1/object/Downloads/launcher-release.json`, {
        body: JSON.stringify(launcherReleaseInfo),
        headers: {
            authorization: "Bearer " + process.env.SUPABASE_SERVICE_ROLE_TOKEN,
            "cache-control": "3600",
            "content-type": "application/json"
        },
        responseType: "json"
    });

    console.log("Done!");
})();