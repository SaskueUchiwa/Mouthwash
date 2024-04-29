import * as shell from "@tauri-apps/api/shell";
import * as fs from "@tauri-apps/api/fs";
import * as path from "@tauri-apps/api/path";
import { AUInstaller } from "./AUInstaller";

export class LocalSteamAUInstaller extends AUInstaller {
    protected _pingCheckInterval: NodeJS.Timeout|undefined;
    protected _validateInterval: NodeJS.Timeout|undefined;

    constructor(public readonly steamInstallationPath) {
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

    async beginInstallation(installPath: string): Promise<void> {
        const steamExePath = await path.join(this.steamInstallationPath, "steam.exe");
        const steamContentFolder = await path.join(this.steamInstallationPath, "steamapps", "content")
        const steamInstallAppFolder = await path.join(steamContentFolder, "app_945360");
        const steamInstallDepotFolder = await path.join(steamInstallAppFolder, "depot_945361");

        const finalFilePath = await path.join(steamInstallDepotFolder, "vcruntime140.dll");

        await fs.removeDir(steamInstallAppFolder, { recursive: true });

        new shell.Command("powershell", [ "-Command", steamExePath.replace(/\\(.+\s+.+?)\\/g, `\\'$1'\\`), "-argument \"+download_depot 945360 945361 4593126137370998619\"" ]);
        this.emit("start", { hasProgress: false });

        this._pingCheckInterval = setInterval(async () => {
            if (!await fs.exists(finalFilePath))
                return;

            clearInterval(this._pingCheckInterval);
            this._pingCheckInterval = undefined;
            
            await this.moveFilesInFolder(steamInstallDepotFolder, installPath);

            this.emit("finish", { success: true, failReason: "" });
        }, 1500);

        this._validateInterval = setTimeout(async () => {
            if (await fs.exists(steamInstallAppFolder))
                return;

            this.emit("error", { error: "Couldn't download Among Us. You likely don't own the game, or there's some other issue. Contact support for help." });
            this._validateInterval = undefined;
        }, 45000);
    }

    async cancelInstallation(): Promise<void> {
        if (this._pingCheckInterval !== undefined) {
            clearInterval(this._pingCheckInterval);
            this._pingCheckInterval = undefined;
        }
        if (this._validateInterval !== undefined) {
            clearTimeout(this._validateInterval);
            this._validateInterval = undefined;
        }
    }
}