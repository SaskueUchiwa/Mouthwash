import Emittery from "emittery";

export type AUInstallerEvents = {
    start: { hasProgress: boolean; };
    progress: { amountDownloaded: number; };
    finish: { success: boolean; failReason: string; };
    error: { error: string; };
}

export abstract class AUInstaller extends Emittery<AUInstallerEvents> {
    abstract beginInstallation(installPath: string): Promise<void>;
    abstract cancelInstallation(): Promise<void>;
}