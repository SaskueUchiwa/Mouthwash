import * as shell from "@tauri-apps/api/shell";
import * as fs from "@tauri-apps/api/fs";
import * as path from "@tauri-apps/api/path";
import * as window from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api";
import { AUInstaller } from "./AUInstaller";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class AuthenticatedEpicGamesAUInstaller extends AUInstaller {
    protected legendaryProcess: shell.Child;

    constructor(public readonly useLauncherLogin: boolean) {
        super();
    }
    
    async moveFilesInFolder(originPath: string, destPath: string) {
        const filesInOrigin = await fs.readDir(originPath);
        await fs.createDir(destPath, { recursive: true });

        for (const file of filesInOrigin) {
            const subOriginPath = await path.join(originPath, file.name);
            const subDestPath = await path.join(destPath, file.name);
            if (Array.isArray(file.children)) {
                await this.moveFilesInFolder(subOriginPath, subDestPath);
            } else {
                await fs.renameFile(subOriginPath, subDestPath);
            }
        }
    }

    protected async done(legendaryPath: string) {
        await this.legendaryProcess.kill();
        await sleep(2000);
        await fs.removeDir(await path.dirname(legendaryPath), { recursive: true });
    }

    protected async legendaryAuth(installPath: string, legendaryPath: string, useLauncherLogin: boolean) {
        await sleep(2000);

        console.log("Logging out of any existing session..");
        const logoutCmd = shell.Command.sidecar("../external/legendary", [ "auth", "--delete" ]);
        await logoutCmd.execute();

        await sleep(2000);
        console.log("Requesting log-in into EpicGames account..");
        const cmd = shell.Command.sidecar("../external/legendary", [
            "auth",
            useLauncherLogin ? "--import" : ""
        ]);
        this.legendaryProcess = await cmd.spawn();
        
        cmd.stdout.on("data", async buf => {
            const bufString: string = buf.toString();
            console.log("stdout:", bufString);
        });
        cmd.stderr.on("data", async buf => {
            const bufString: string = buf.toString();
            console.log("stderr:", bufString);
            
            if (bufString.includes("Stored credentials are still valid")) { // Game downloaded
                await this.legendaryProcess.kill();
                await this.callLegendary(installPath, legendaryPath);
            }

            if (bufString.includes("login attempt failed")) {
                this.emit("error", { error: "Invalid EpicGames login, please try again" });
                await this.legendaryProcess.kill();
            }

            if (bufString.includes("Successfully logged in") || bufString.includes("Successfully imported login session")) { // Game installed
                await this.legendaryProcess.kill();
                await this.callLegendary(installPath, legendaryPath);
            }

            if (bufString.includes("Login session from EGS seems to no longer be valid")) {
                await this.legendaryProcess.kill();
                await this.legendaryAuth(installPath, legendaryPath, false);
            }
        });
    }

    protected async callLegendary(installPath: string, legendaryPath: string) {
        console.log("Calling legendary install manifest..");
        await sleep(5000);
        await fs.createDir(installPath, { recursive: true });
        const cmd = shell.Command.sidecar("../external/legendary", [
            "install", "AmongUs",
            "-manifest", "https://jhwupengaqaqjewreahz.supabase.co/storage/v1/object/public/Downloads/E6C20FC34525F4BAA321CA9909D831E2.manifest",
            "--game-folder", installPath,
            "--force"
        ]);
        this.legendaryProcess = await cmd.spawn();

        this.legendaryProcess.write("Y\r\n");
        
        cmd.stdout.on("data", async buf => {
            const bufString: string = buf.toString();
            console.log("stdout:", bufString);
        });
        cmd.stderr.on("data", async buf => {
            const bufString: string = buf.toString();
            console.log("stderr:", bufString);

            const percRegExp = /\d+(\.\d+)?%/;
            if (bufString.includes("Progress:") && percRegExp.test(bufString)) { // Download percentage
                const percentage = bufString.match(percRegExp);
                const numberPart = percentage[0].replace(/[^0-9.]/g, "");
                const percentageNumber = parseFloat(numberPart);

                this.emit("progress", { amountDownloaded: 0.5 + percentageNumber / 100 / 2 });
            }

            if (bufString.includes("not available from this account")) { // user doesn't have Among Us bought
                this.emit("finish", { success: true, failReason: "The account you logged into does not have Among Us bought, make sure you have purchased the game." });
                await this.done(legendaryPath);
            }

            if (bufString.includes("All done!")) { // Game downloaded
                this.emit("finish", { success: true, failReason: "" });
                await this.done(legendaryPath);
            }

            if (bufString.includes("the game is either already up to date")) {
                this.emit("finish", { success: true, failReason: "" });
                await this.done(legendaryPath);
            }

            if (bufString.includes("No saved credentials")) {
                this.emit("error", { error: "Invalid EpicGames login, please try again" });
                await this.legendaryProcess.kill();
            }

            if (bufString.includes("did you type the name correctly")) {
                this.emit("finish", { success: true, failReason: "The account you logged into does not have Among Us bought, make sure you have purchased the game." });
                await this.legendaryProcess.kill();
            }
        });
    }

    async beginInstallation(installPath: string): Promise<void> {
        const id = Math.random().toString(16).substring(2);
        const legendaryPath = await path.join(await path.appDataDir(), "legendary", "legendary.exe");
        
        window.appWindow.listen("mwgg://start-download", ev => {
            if (ev.payload !== id)
                return;

            this.emit("start", { hasProgress: true });            
        });
        
        window.appWindow.listen("mwgg://download-progress", ev => {
            const payload = ev.payload as { download_ratio: number; bytes_per_second: number; download_id: string; };
            if (payload.download_id !== id)
                return;

            this.emit("progress", { amountDownloaded: payload.download_ratio / 2 /* legendary is only half of the total installation */ });
        });
        
        window.appWindow.listen("mwgg://finish-download", ev => {
            if (ev.payload !== id)
                return;

            this.legendaryAuth(installPath, legendaryPath, this.useLauncherLogin);
        });

        const success = await invoke("download_file", {
            url: "https://github.com/derrod/legendary/releases/download/0.20.33/legendary.exe",
            file: legendaryPath,
            downloadId: id
        });

        if (!success) {
            this.emit("error", { error: "Failed to download Among Us v2021.6.30s. Try another installation method." });
            return;
        }
    }

    async cancelInstallation(): Promise<void> {
        this.legendaryProcess.kill();
    }
}