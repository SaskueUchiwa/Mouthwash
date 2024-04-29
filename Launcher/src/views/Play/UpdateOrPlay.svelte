<script lang="ts">
    import { createEventDispatcher } from "svelte";
    const dispatchEvent = createEventDispatcher();

    import * as window from "@tauri-apps/api/window";

    import ArrowUp from "../../icons/ArrowUp.svelte";
    import LaunchSmall from "../../icons/LaunchSmall.svelte";
    import Loader from "../../icons/Loader.svelte";
    import { loading, unavailable, user } from "../../stores/accounts";
    import { gameInstalledVersionState, gameRemoteVersionState, type ChangeLogEntry, gameInstalledPathState, amongUsProcess } from "../../stores/gameState";
    import { invoke } from "@tauri-apps/api";
    import DownloadSmall from "../../icons/DownloadSmall.svelte";

    let downloadStage: string|null = null;
    let downloadState: null|number = null;
    let downloadError: null|string = null;

    function isVersionGreater(a: string, b: string) {
        const [ aYear, aMonth, aDay ] = a.split(".");
        const [ bYear, bMonth, bDay ] = b.split(".");

        if (parseInt(aYear) > parseInt(bYear)) {
            return true;
        }

        if (parseInt(aMonth) > parseInt(bMonth)) {
            return true;
        }

        if (parseInt(aDay) > parseInt(bDay)) {
            return true;
        }

        return false;
    }

    async function updateAndInstallMods(installPath: string, remoteVersion: ChangeLogEntry) {
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

            downloadStage = null;
            downloadState = null;

            gameInstalledVersionState.set(remoteVersion.version);
            localStorage.setItem("installation-version", remoteVersion.version);
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

    $: updateRequired = $gameRemoteVersionState === loading || $gameInstalledVersionState === loading
        ? loading
        : $gameRemoteVersionState === unavailable || $gameInstalledVersionState === unavailable
            ? unavailable
            : $gameRemoteVersionState instanceof Error
                ? unavailable
                : isVersionGreater($gameRemoteVersionState.version, $gameInstalledVersionState)
                    ? $gameRemoteVersionState
                    : unavailable;
                    

    async function beginUpdate() {
        if (updateRequired === loading || updateRequired === unavailable)
            return;

        if ($gameInstalledPathState === loading || $gameInstalledPathState === unavailable)
            return;

        await updateAndInstallMods($gameInstalledPathState, updateRequired);
    }

    function launchGame() {
        dispatchEvent("launch-game");
    }

    $: notLoggedIn = $user === unavailable || $user === loading;
</script>

{#if updateRequired === loading || updateRequired === unavailable || downloadState !== null}
    <button
        class="flex items-center justify-center rounded-l-lg px-6 py-4 bg-card-200 hover:bg-[#1c072b] hover:text-text-300 filter border-none font-inherit text-inherit cursor-pointer"
        class:grayscale={downloadStage !== null || (updateRequired === unavailable && notLoggedIn) || updateRequired === loading || $amongUsProcess !== unavailable}
        class:pointer-events-none={downloadStage !== null || (updateRequired === unavailable && notLoggedIn) || updateRequired === loading || $amongUsProcess !== unavailable}
        on:click={launchGame}
    >
        <div class="flex items-center gap-2">
            {#if downloadState !== null}
                <DownloadSmall size={20}/>
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
            {:else if updateRequired === loading}
                <Loader size={20}/>
                <div class="flex flex-col items-start">
                    <span class="text-xl leading-5">Loading</span>
                    <span class="text-text-300 text-xs leading-3 italic">Fetching version..</span>
                </div>
            {:else if updateRequired === unavailable}
                <LaunchSmall size={20}/>
                <div class="flex flex-col items-start">
                    <span class="text-xl leading-5">Launch</span>
                    <span class="text-text-300 text-xs leading-3 italic">{$gameInstalledVersionState.toString()}</span>
                </div>
            {/if}
        </div>
    </button>
{:else}
    <button
        class="flex items-center justify-center rounded-l-lg px-6 py-4 text-white bg-accent2 hover:bg-accent2/70 hover:text-text-300 filter border-none font-inherit cursor-pointer"
        on:click={beginUpdate}
    >
        <div class="flex items-center gap-2">
            <ArrowUp size={20}/>
            <div class="flex flex-col text-white items-start">
                <span class="text-xl leading-5">Update</span>
                {#if $gameRemoteVersionState === loading}
                    <span class="text-text-200 text-xs leading-3 italic">Fetching version..</span>
                {:else if $gameRemoteVersionState === unavailable}
                    <span class="text-text-200 text-xs leading-3 italic">Could not get version</span>
                {:else if $gameRemoteVersionState instanceof Error}
                    <span class="text-text-200 text-xs leading-3 italic">Error fetching version</span>
                {:else}
                    <span class="text-text-200 text-xs leading-3 italic">{$gameRemoteVersionState.version} {Math.ceil($gameRemoteVersionState.release_download_bytes / 1024 / 1024)}MB</span>
                {/if}
            </div>
        </div>
    </button>
{/if}