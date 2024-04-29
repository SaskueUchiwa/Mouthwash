<script lang="ts">
    import { createEventDispatcher } from "svelte";
    const dispatchEvent = createEventDispatcher();

    import * as shell from "@tauri-apps/api/shell";
    import * as fs from "@tauri-apps/api/fs";
    import Cog from "../../icons/Cog.svelte";
    import Folder from "../../icons/Folder.svelte";
    import { amongUsProcess, gameInstalledPathState, gameInstalledVersionState } from "../../stores/gameState";
    import { loading, unavailable } from "../../stores/accounts";

    export let isVisible = false;

    export function open() {
        isVisible = true;
    }

    export function close() {
        isVisible = false
    }

    async function openInstallationFolder() {
        if ($gameInstalledPathState === unavailable || $gameInstalledPathState === loading)
            return;

        shell.open($gameInstalledPathState);
    }

    async function uninstall() {
        if ($gameInstalledPathState === unavailable || $gameInstalledPathState === loading)
            return;

        await fs.removeDir($gameInstalledPathState, { recursive: true });
        gameInstalledPathState.set(unavailable);
        gameInstalledVersionState.set(unavailable);
        localStorage.removeItem("installation-path");
        localStorage.removeItem("installation-version");
        close();

        dispatchEvent("switch-view", { view: "Download" });
    }
</script>

<div class="left-0 top-0 w-full h-full items-center justify-center bg-[#000000b5]" class:flex={isVisible} class:hidden={!isVisible} class:fixed={isVisible}>
    <div class="bg-surface-200 w-1/4 rounded-xl shadow-lg px-6 p-4">
        <div class="flex flex-col h-full gap-2">
            <div class="flex items-center gap-2">
                <Cog size={20}/>
                <span class="text-lg">Game Settings</span>
            </div>
            <span class="text-md">Installation Folder</span>
            <div class="flex rounded-lg">
                <div class="p-2 rounded-l-lg bg-surface-100"><Folder size={14}/></div>
                {#if $gameInstalledPathState === loading}
                    <span>Loading installation path..</span>
                {:else if $gameInstalledPathState === unavailable}
                    <span>Couldn't find installation path</span>
                {:else}
                    <input class="outline-none flex-1 rounded-r-lg bg-surface-100 w-64 text-xs border-none font-inherit text-inherit" placeholder="Location" readonly value={$gameInstalledPathState}>
                {/if}
            </div>
            <button class="rounded-lg bg-card-200 px-4 py-1 hover:bg-card-300 hover:text-text-300 filter border-none font-inherit text-inherit cursor-pointer"
                class:grayscale={$gameInstalledPathState === unavailable || $gameInstalledPathState === loading}
                class:pointer-events-none={$gameInstalledPathState === unavailable || $gameInstalledPathState === loading}
                on:click={openInstallationFolder}
            >
                Open Folder
            </button>
            <span class="text-md">Uninstall</span>
            <p class="text-text-300 italic text-xs">
                This will just delete the folder you've installed PGG: Rewritten to. You'll be able to re-install
                at any point.
            </p>
            <button class="rounded-lg bg-card-200 px-4 py-1 hover:bg-card-300 hover:text-text-300 filter"
                class:grayscale={$amongUsProcess !== unavailable}
                class:pointer-events-none={$amongUsProcess !== unavailable}
                on:click={uninstall}
            >
                Uninstall
            </button>
            {#if $amongUsProcess !== unavailable}
                <span class="text-yellow-500 text-xs my-0.5">Cannot uninstall game while it is running.</span>
            {/if}
            <button class="rounded-lg bg-card-200 px-4 py-1 self-end mt-4 hover:bg-card-300 hover:text-text-300 filter"
                on:click={close}
            >
                Close
            </button>
        </div>
    </div>
</div>