import * as shell from "@tauri-apps/api/shell";
import * as fs from "@tauri-apps/api/fs";
import * as path from "@tauri-apps/api/path";
import * as window from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api";
import { AUInstaller } from "./AUInstaller";
import SteamAuth from "../views/Download/SteamAuth.svelte";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class AuthenticatedSteamAUInstaller extends AUInstaller {
    protected depotDownloaderProcess: shell.Child;

    constructor(public readonly username: string, public readonly password: string, public readonly steamAuthModal: SteamAuth) {
        super();
    }
    
    protected async done(depotDownloaderPath: string) {
        await this.depotDownloaderProcess.kill();
        await sleep(2000);
        await fs.removeDir(depotDownloaderPath, { recursive: true });
    }

    protected async callDepotDownloader(installPath: string, depotDownloaderPath: string) {
        await sleep(5000);
        await fs.createDir(installPath, { recursive: true });
        const cmd = shell.Command.sidecar("../external/depot-downloader", [
            "-app", "945360",
            "-depot", "945361",
            "-manifest", "4593126137370998619",
            "-username", this.username,
            "-password", this.password,
            "-dir", installPath
        ]);
        this.depotDownloaderProcess = await cmd.spawn();
        
        cmd.stdout.on("data", async buf => {
            const bufString: string = buf.toString();
            console.log(bufString);

            const percRegExp = /\d+(\.\d+)?%/;
            if (percRegExp.test(bufString)) { // Download percentage
                const percentage = bufString.match(percRegExp);
                const numberPart = percentage[0].replace(/[^0-9.]/g, "");
                const percentageNumber = parseFloat(numberPart);

                this.emit("progress", { amountDownloaded: 0.5 + percentageNumber / 100 / 2 });
            }

            if (bufString.includes("into Steam")) { // Logging into Steam.
                this.steamAuthModal.open(false, (inp: string) => this.depotDownloaderProcess.write(inp + "\r\n"));
            }

            if (bufString.includes("licenses")) { // Logged into steam (contains number of game licenses)
                this.steamAuthModal.close();
            }

            if (bufString.includes("not available from this account")) { // user doesn't have Among Us bought
                this.emit("finish", { success: true, failReason: "The account you logged into does not have Among Us bought, make sure you have purchased the game." });
                await this.done(depotDownloaderPath);
            }

            if (bufString.includes("Downloaded")) { // Game downloaded
                this.emit("finish", { success: true, failReason: "" });
                await this.done(depotDownloaderPath);
            }
        });
        cmd.stderr.on("data", buf => {
            const bufString: string = buf.toString();

            console.log(bufString);

            if (bufString.includes("STEAM GUARD") || "confirm") {
                if (bufString.includes("is incorrect")) { // invalid steam auth
                    this.steamAuthModal.open(true, (inp: string) => this.depotDownloaderProcess.write(inp + "\r\n"));
                }
            }
        });
    }

    async beginInstallation(installPath: string): Promise<void> {
        const id = Math.random().toString(16).substring(2);
        const depotDownloaderPath = await path.join(await path.appDataDir(), "depot-downloader");
        
        window.appWindow.listen("mwgg://start-download", ev => {
            if (ev.payload !== id)
                return;

            this.emit("start", { hasProgress: true });            
        });
        
        window.appWindow.listen("mwgg://download-progress", ev => {
            const payload = ev.payload as { download_ratio: number; bytes_per_second: number; download_id: string; };
            if (payload.download_id !== id)
                return;

            this.emit("progress", { amountDownloaded: payload.download_ratio / 2 /* depot downloader is only half of the total installation */ });
        });
        
        window.appWindow.listen("mwgg://finish-download", ev => {
            if (ev.payload !== id)
                return;

            this.callDepotDownloader(installPath, depotDownloaderPath);
        });

        const success = await invoke("download_file_and_extract", {
            url: "https://github.com/SteamRE/DepotDownloader/releases/download/DepotDownloader_2.5.0/DepotDownloader-windows-x64.zip",
            folder: depotDownloaderPath,
            downloadId: id
        });

        if (!success) {
            this.emit("error", { error: "Failed to download Among Us v2021.6.30s. Try another installation method." });
            return;
        }
    }

    async cancelInstallation(): Promise<void> {
        this.depotDownloaderProcess.kill();
    }
}