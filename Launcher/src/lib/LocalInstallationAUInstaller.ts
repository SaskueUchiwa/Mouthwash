import * as fs from "@tauri-apps/api/fs";
import * as path from "@tauri-apps/api/path";
import { AUInstaller } from "./AUInstaller";

export class LocalInstallationAUInstaller extends AUInstaller {
    constructor(public readonly installedAmongUsPath) {
        super();
    }
    
    async copyFilesInFolder(originPath: string, destPath: string) {
        const filesInOrigin = await fs.readDir(originPath);
        await fs.createDir(destPath, { recursive: true });

        for (const file of filesInOrigin) {
            const subOriginPath = await path.join(originPath, file.name);
            const subDestPath = await path.join(destPath, file.name);
            if (Array.isArray(file.children)) {
                await this.copyFilesInFolder(subOriginPath, subDestPath);
            } else {
                await fs.copyFile(subOriginPath, subDestPath);
            }
        }
    }

    async beginInstallation(installPath: string): Promise<void> {
        await this.copyFilesInFolder(this.installedAmongUsPath, installPath);
        this.emit("finish", { success: true, failReason: "" });
    }

    async cancelInstallation(): Promise<void> {

    }
}