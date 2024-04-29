<script lang="ts">
    import { createEventDispatcher } from "svelte";
    const dispatchEvent = createEventDispatcher();

    import { invoke } from "@tauri-apps/api";
    import * as path from "@tauri-apps/api/path";
    import * as window from "@tauri-apps/api/window";

    import Cog from "../../icons/Cog.svelte";
    import DownloadSmall from "../../icons/DownloadSmall.svelte";
    import type { AUInstaller } from "../../lib/AUInstaller";
    import DownloadSetup from "./DownloadSetup.svelte";
    import SteamAuth from "./SteamAuth.svelte";
    import { gameInstalledPathState, gameInstalledVersionState, type ChangeLogEntry, gameRemoteVersionState } from "../../stores/gameState";
    import { unavailable, loading } from "../../stores/accounts";
    import DownloadSettings from "./DownloadSettings.svelte";

    let installPath: string;
    let settingsOpen: boolean;
    let downloadSetupOpen: boolean;

    let downloadStage: string|null = null;
    let downloadState: undefined|null|number = undefined;
    let downloadError: null|string = null;

    let downloadSettings: DownloadSettings;
    let downloadSetupModal: DownloadSetup;
    let steamAuthModal: SteamAuth;

    function beginDownload() {
        downloadSetupModal.show();
    }

    async function downloadAndInstallMods(installPath: string, remoteVersion: ChangeLogEntry) {
        const id = Math.random().toString(16).substring(2);
        downloadStage = "PGG: Rewritten";
        downloadState = undefined;

        window.appWindow.listen("mwgg://start-download", ev => {
            if (ev.payload !== id)
                return;

            downloadState = null;
        });
        
        window.appWindow.listen("mwgg://download-progress", ev => {
            const payload = ev.payload as { download_ratio: number; bytes_per_second: number; download_id: string; };
            if (payload.download_id !== id)
                return;

            downloadState = payload.download_ratio;
        });
        
        window.appWindow.listen("mwgg://finish-download", ev => {
            if (ev.payload !== id)
                return;

            downloadState = 1;
            gameInstalledPathState.set(installPath);
            localStorage.setItem("installation-path", installPath);

            gameInstalledVersionState.set(remoteVersion.version);
            localStorage.setItem("installation-version", remoteVersion.version);

            dispatchEvent("switch-view", { view: "Play" });
            downloadState = undefined;
            downloadStage = null;
        });

        const success = await invoke("download_file_and_extract", {
            url: remoteVersion.release_url,
            folder: installPath,
            downloadId: id
        });

        if (!success) {
            this.emit("error", { error: "Failed to download mods. Check your internet connection or try again later." });
            return;
        }
    }

    async function finaliseDownload(ev: CustomEvent<{ installer: AUInstaller }>) {
        if ($gameRemoteVersionState === unavailable || $gameRemoteVersionState === loading)
            return;

        const installPath = await path.join(await path.appDataDir(), "Game");

        downloadError = null;
        const { installer } = ev.detail;
        
        downloadStage = "AU v2021.6.30";
        downloadState = undefined;

        installer.on("start", ({ hasProgress }) => {
            if (hasProgress) {
                downloadState = 0;
            } else {
                downloadState = null;
            }
        });

        installer.on("progress", ({ amountDownloaded }) => {
            downloadState = amountDownloaded;
        });

        installer.on("finish", ({ success, failReason }) => {
            if (success) {
                downloadState = null;
                downloadStage = "Mods";

                downloadAndInstallMods(installPath, $gameRemoteVersionState as ChangeLogEntry);
            } else {
                downloadError = failReason;
                downloadStage = null;
                downloadState = undefined;
            }
        });

        installer.on("error", ({ error }) => {
            downloadError = error;
            installer.cancelInstallation();
            downloadStage = null;
            downloadState = undefined;
        });
        
        await installer.beginInstallation(installPath);
    }
</script>

<div class="flex gap-4 self-stretch h-full">
    <div class="w-full flex flex-col bg-base-200 rounded-xl gap-4">
        <div class="flex-[3_0_0] w-full bg-card-200 rounded-t-xl" style="background-image: url('https://placekitten.com/1080/439')"></div>
        <div class="flex-1 flex flex-col items-center justify-center">
            <div class="flex border-2 border-transparent rounded-lg">
                <button class="flex items-center justify-center rounded-l-lg bg-card-200 px-6 py-4 hover:bg-card-300 hover:text-text-300 filter border-none font-inherit text-inherit cursor-pointer"
                    class:grayscale={downloadStage !== null || downloadSetupOpen}
                    class:pointer-events-none={downloadStage !== null || downloadSetupOpen}
                    on:click={beginDownload}
                >
                    <div class="flex items-center gap-2">
                        <DownloadSmall size={20}/>
                        {#if downloadStage === null}
                            <div class="flex flex-col items-start">
                                <span class="text-xl leading-5">Download</span>
                                {#if $gameRemoteVersionState === loading}
                                    <span class="text-text-300 text-xs leading-3 italic">Loading version..</span>
                                {:else if $gameRemoteVersionState === unavailable}
                                    <span class="text-text-300 text-xs leading-3 italic">Could not get version</span>
                                {:else if $gameRemoteVersionState instanceof Error}
                                    <span class="text-text-300 text-xs leading-3 italic">Error fetching version</span>
                                {:else}
                                    <span class="text-text-300 text-xs leading-3 italic">{$gameRemoteVersionState.version} {Math.ceil($gameRemoteVersionState.release_download_bytes / 1024 / 1024)}MB</span>
                                {/if}
                            </div>
                        {:else}
                            <div class="flex flex-col items-start">
                                <span class="text-xl leading-5">{downloadStage}</span>
                                {#if downloadState === undefined}
                                    <span class="text-text-300 text-xs leading-3 italic">Loading..</span>
                                {:else if downloadState === null}
                                    <span class="text-text-300 text-xs leading-3 italic">Downloading..</span>
                                {:else}
                                    <span class="text-text-300 text-xs leading-3 italic">{(downloadState * 100).toFixed(2)}%</span>
                                {/if}
                            </div>
                        {/if}
                    </div>
                </button>
                <button class="flex items-center justify-center rounded-r-lg bg-card-200 p-4 hover:bg-card-300 hover:text-text-300 filter border-none font-inherit text-inherit cursor-pointer"
                    class:grayscale={settingsOpen || downloadStage !== null}
                    class:pointer-events-none={settingsOpen || downloadStage !== null}
                    on:click={() => downloadSettings.open()}
                >
                    <Cog size={20}/>
                </button>
            </div>
            {#if downloadError !== null}
                <p class="text-yellow-500 my-0.5 text-xs">{@html downloadError}</p>
            {/if}
        </div>
    </div>
</div>
<SteamAuth bind:this={steamAuthModal}/>
<DownloadSetup {steamAuthModal} bind:isVisible={downloadSetupOpen} bind:this={downloadSetupModal} on:finalise-download={finaliseDownload}/>
<DownloadSettings bind:installPath bind:isVisible={settingsOpen} bind:this={downloadSettings}/>