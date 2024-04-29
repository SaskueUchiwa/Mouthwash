const { default: got } = require("got");
const fs = require("fs/promises");
const path = require("path");
const JSZip = require("jszip");

const externalBinsDir = path.join(__dirname, "../external");

(async () => {
    await fs.mkdir(externalBinsDir, { recursive: true });

    console.log("Downloading legendary..");
    const legendaryRes = await got.get("https://github.com/derrod/legendary/releases/download/0.20.33/legendary.exe", { responseType: "buffer" });
    console.log("|- Downloaded!");
    await fs.writeFile(path.join(externalBinsDir, "legendary-x86_64-pc-windows-msvc.exe"), legendaryRes.body);
    console.log("|- Wrote file!");
    
    console.log("Downloading depot downloader..");
    const depotDownloaderRes = await got.get("https://github.com/SteamRE/DepotDownloader/releases/download/DepotDownloader_2.5.0/DepotDownloader-windows-x64.zip", { responseType: "buffer" });
    console.log("|- Downloaded!");
    const zip = new JSZip();
    await zip.loadAsync(depotDownloaderRes.body);
    console.log("|- Unzipped!");
    const ddlFile = zip.file("DepotDownloader.exe");
    await fs.writeFile(path.join(externalBinsDir, "depot-downloader-x86_64-pc-windows-msvc.exe"), await ddlFile.async("nodebuffer"));
    console.log("|- Wrote file!");
})();