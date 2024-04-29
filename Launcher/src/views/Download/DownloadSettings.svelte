<script lang="ts">
    import * as path from "@tauri-apps/api/path";
    import * as dialog from "@tauri-apps/api/dialog";
    import { onMount } from "svelte";
    import Cog from "../../icons/Cog.svelte";
    import ArrowPath from "../../icons/ArrowPath.svelte";
    import Folder from "../../icons/Folder.svelte";

    export let installPath: string;
    export let isVisible = false;

    export function open() {
        isVisible = true;
    }

    export function close() {
        isVisible = false;
    }

    onMount(async () => {
        installPath = localStorage.getItem("installation-path") || await getDefault();
    });

    async function getDefault() {
        return await path.join(await path.appDataDir(), "PGG Rewritten");
    }

    async function findDefault() {
        installPath = await getDefault();
        localStorage.removeItem("installation-path");
    }
    
    let selectInstallationFolderMessage = null;
    let hasFolderDialogueOpen = false;
    async function locateInstallationFolder() {
        selectInstallationFolderMessage = null;

        hasFolderDialogueOpen = true;
        const steamFolderPath = await dialog.open({
            directory: true,
            multiple: false,
            defaultPath: installPath || undefined,
            title: "Select Installation Folder",
            recursive: true
        });
        hasFolderDialogueOpen = false;

        const resolvedPath = Array.isArray(steamFolderPath) ? steamFolderPath[0] : steamFolderPath;
        if (resolvedPath) {
            installPath = await path.join(resolvedPath, "PGG Rewritten");
            localStorage.setItem("installation-path", installPath);
        }
    }
</script>

<div class="left-0 top-0 w-full h-full items-center justify-center bg-[#000000b5] z-10" class:flex={isVisible} class:hidden={!isVisible} class:fixed={isVisible}>
    <div class="bg-surface-200 w-1/4 h-1/4 rounded-xl shadow-lg px-6 p-4">
        <div class="flex flex-col h-full gap-2">
            <div class="flex items-center gap-2">
                <Cog size={20}/>
                <span class="text-lg">Download Settings</span>
            </div>
            <span class="text-md">Installation Folder</span>
            <div class="flex rounded-lg">
                <div class="p-2 rounded-l-lg bg-surface-100"><Folder size={14}/></div>
                <input class="outline-none flex-1 rounded-r-lg bg-surface-100 w-64 text-xs border-none font-inherit text-inherit" placeholder="Location" readonly value={installPath}>
                <button class="rounded-lg bg-card-200 px-4 py-1 hover:bg-card-300 hover:text-text-300 filter border-none font-inherit text-inherit cursor-pointer" on:click={findDefault}>
                    <ArrowPath size={14}/>
                </button>
            </div>
            <button class="rounded-lg bg-card-200 px-4 py-1 hover:bg-card-300 hover:text-text-300 filter border-none font-inherit text-inherit cursor-pointer"
                class:grayscale={hasFolderDialogueOpen}
                class:pointer-events-none={hasFolderDialogueOpen}
                on:click={locateInstallationFolder}
            >
                Select Folder
            </button>
            {#if selectInstallationFolderMessage !== null}
                <p class="text-yellow-500 my-0.5 text-xs">{@html selectInstallationFolderMessage}</p>
            {/if}
            <button class="rounded-lg bg-card-200 px-4 py-1 self-end mt-auto hover:bg-card-300 hover:text-text-300 filter"
                on:click={close}
            >
                Close
            </button>
        </div>
    </div>
</div>