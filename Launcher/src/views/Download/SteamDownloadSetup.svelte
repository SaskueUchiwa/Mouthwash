<script lang="ts">
    import * as path from "@tauri-apps/api/path";
    import * as fs from "@tauri-apps/api/fs";
    import * as dialog from "@tauri-apps/api/dialog";

    import Folder from "../../icons/Folder.svelte";
    import Key from "../../icons/Key.svelte";
    import Tag from "../../icons/Tag.svelte";
    import { onMount } from "svelte";
    import { invoke } from "@tauri-apps/api";
    import ArrowPath from "../../icons/ArrowPath.svelte";
    import { LocalSteamAUInstaller } from "../../lib/LocalSteamAUInstaller";
    import { AuthenticatedSteamAUInstaller } from "../../lib/AuthenticatedSteamAUInstaller";
    import SteamAuth from "./SteamAuth.svelte";
    
    export let steamAuthModal: SteamAuth;

    let selectedTab = 0;

    let username = "";
    let password = "";

    let selectSteamFolderErrorMessage: string|null = null;
    let selectedSteamInstallationPath = "";
    let hasFolderDialogueOpen = false;

    const knownSteamLocations = [ "C:\\Program Files (x86)\\Steam" ];
    async function isSteamInstalledHere(folder: string) {
        const steamExePath = await path.join(folder, "steam.exe");
        if (await fs.exists(steamExePath)) {
            return true;
        }
        return false;
    }

    export async function validate() {
        if (!selectedSteamInstallationPath) {
            selectSteamFolderErrorMessage = "You need to locate Steam on your computer to start downloading. Alternatively, login with Steam instead.";
            return false;
        }

        if (!await isSteamInstalledHere(selectedSteamInstallationPath)) {
            selectSteamFolderErrorMessage = "Couldn't find steam in the selected location.";
            return false;
        }

        return true;
    }

    export function getInstaller() {
        if (selectedTab === 0) {
            return new LocalSteamAUInstaller(selectedSteamInstallationPath);
        } else if (selectedTab === 1) {
            return new AuthenticatedSteamAUInstaller(username, password, steamAuthModal);
        }
    }
    
    async function findSteam() {
        const registryInstallationPath = await invoke<string>("get_steam_registry_install_location");
        if (await isSteamInstalledHere(registryInstallationPath)) {
            selectedSteamInstallationPath = registryInstallationPath;
            return;
        }
        
        for (const steamLocation of knownSteamLocations) {
            if (await isSteamInstalledHere(steamLocation)) {
                selectedSteamInstallationPath = steamLocation;
                return;
            }
        }

        selectSteamFolderErrorMessage = "Couldn't automatically find your steam installation. Locate it using the button above.";
    }

    async function locateSteamFolder() {
        selectSteamFolderErrorMessage = null;

        hasFolderDialogueOpen = true;
        const steamFolderPath = await dialog.open({
            directory: true,
            multiple: false,
            defaultPath: selectedSteamInstallationPath || undefined,
            title: "Open Steam Folder",
            recursive: true
        });
        hasFolderDialogueOpen = false;

        const resolvedPath = Array.isArray(steamFolderPath) ? steamFolderPath[0] : steamFolderPath;
        if (resolvedPath) {
            if (!await isSteamInstalledHere(resolvedPath)) {
                selectSteamFolderErrorMessage = "Couldn't find steam in that location.";
                return;
            }

            selectedSteamInstallationPath = resolvedPath;
        }
    }

    onMount(async () => {
        await findSteam();
    });

    function selectTab(idx: number) {
        selectSteamFolderErrorMessage = null;
        selectedTab = idx;
    }
</script>

<p class="text-text-300 italic text-xs">
    You can either locate Steam on your computer (the launcher might be able to find it for you), or
    you can login with Steam using your username and password.
    <br><br>
    While the process is completely secure, if you don't trust the launcher with your details
    then you should use the first option.
</p>
<div class="flex flex-col bg-surface-100 rounded-lg">
    <div class="flex">
        <button
            class="flex-1 p-2 border-transparent border-b-2 border-none font-inherit text-inherit cursor-pointer"
            class:bg-surface-200={selectedTab !== 0}
            class:bg-transparent={selectedTab === 0}
            class:border-surface-200={selectedTab !== 0}
            on:click={() => selectTab(0)}
        >
            <span class="text-sm">Steam Installation</span>
        </button>
        <div class="w-0.5 h-full bg-surface-200 rounded-t-lg"></div>
        <button
            class="flex-1 p-2 border-transparent border-b-2 border-none font-inherit text-inherit cursor-pointer"
            class:bg-surface-200={selectedTab !== 1}
            class:bg-transparent={selectedTab === 1}
            class:border-surface-200={selectedTab !== 1}
            on:click={() => selectTab(1)}
        >
            <span class="text-sm">Login with Steam</span>
        </button>
    </div>
    <div class="flex flex-col gap-2 p-4">
        {#if selectedTab === 0}
            <div class="flex rounded-lg">
                <div class="p-2 rounded-l-lg bg-surface-100"><Folder size={14}/></div>
                <input class="outline-none flex-1 rounded-r-lg bg-surface-100 w-64 text-xs border-none font-inherit text-inherit" placeholder="Location" readonly value={selectedSteamInstallationPath}>
                <button class="rounded-lg bg-card-200 px-4 py-1 hover:bg-card-300 hover:text-text-300 filter border-none font-inherit text-inherit cursor-pointer" on:click={findSteam}>
                    <ArrowPath size={14}/>
                </button>
            </div>
            <button class="rounded-lg bg-card-200 px-4 py-1 hover:bg-card-300 hover:text-text-300 filter border-none font-inherit text-inherit cursor-pointer"
                class:grayscale={hasFolderDialogueOpen}
                class:pointer-events-none={hasFolderDialogueOpen}
                on:click={locateSteamFolder}
            >
                Open Folder
            </button>
            {#if selectSteamFolderErrorMessage !== null}
                <p class="text-yellow-500 my-0.5 text-xs">{@html selectSteamFolderErrorMessage}</p>
            {/if}
        {:else if selectedTab === 1}
            <div class="flex rounded-lg">
                <div class="p-2 bg-card-200 rounded-l-lg"><Tag size={20}/></div>
                <input class="text-md outline-none rounded-r-lg bg-card-200 w-64 border-none font-inherit text-inherit" placeholder="Username" bind:value={username}>
            </div>
            <div class="flex rounded-lg">
                <div class="p-2 bg-card-200 rounded-l-lg"><Key size={20}/></div>
                <input class="text-md outline-none rounded-r-lg bg-card-200 w-64 border-none font-inherit text-inherit" placeholder="Password" type="password" bind:value={password}>
            </div>
        {/if}
    </div>
</div>