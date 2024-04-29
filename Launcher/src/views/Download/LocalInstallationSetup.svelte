<script lang="ts">
    import { invoke } from "@tauri-apps/api";
    import * as dialog from "@tauri-apps/api/dialog";
    import * as fs from "@tauri-apps/api/fs";
    import * as path from "@tauri-apps/api/path";
    import { LocalInstallationAUInstaller } from "../../lib/LocalInstallationAUInstaller";
    import { onMount } from "svelte";
    import Folder from "../../icons/Folder.svelte";
    import ArrowPath from "../../icons/ArrowPath.svelte";

    let selectedAmongUsPath = "";
    let selectedAmongUsPathError: string|null = null;
    let hasFolderDialogueOpen = false;

    const requiredVersion = "2023.7.12";

    export async function validate() {
        const installedVersion = await getAmongUsInstallationVersion(selectedAmongUsPath);
        if (installedVersion !== null) {
            if (installedVersion.trim() !== requiredVersion) {
                selectedAmongUsPathError = `You have version ${installedVersion} installed, but Polus.GG: Rewritten requires version ${requiredVersion}.`;
                return false;
            }
        } else {
            selectedAmongUsPathError = `Couldn't identify the version of the game, make sure it's a full installation.`;
            return false;
        }
        return true;
    }

    export function getInstaller() {
        return new LocalInstallationAUInstaller(selectedAmongUsPath);
    }
    
    const knownSteamLocations = [ "C:\\Program Files (x86)\\Steam" ];
    async function isSteamInstalledHere(folder: string) {
        const steamExePath = await path.join(folder, "steam.exe");
        if (await fs.exists(steamExePath)) {
            return true;
        }
        return false;
    }

    function scanForPattern(haystackBytes: Uint8Array, needleBytes: Uint8Array, index = 0) {
        for (let i = index; i < haystackBytes.length; i++) {
            let flag = false;
            for (let j = 0; j < needleBytes.length; j++) {
                if (haystackBytes[i + j] !== needleBytes[j]) {
                    flag = true;
                    break;
                }
            }
            if (!flag)
                return i;
        }
        return -1;
    }

    async function getAmongUsInstallationVersion(folder: string) {
        const gameManagersPath = await path.join(folder, "Among Us_Data", "globalgamemanagers");
        if (await fs.exists(gameManagersPath)) {
            const gameManagersBytes = await fs.readBinaryFile(gameManagersPath);
            const patternBytes = new TextEncoder().encode("public.app-category.games");
            const versionIdx = scanForPattern(gameManagersBytes, patternBytes) + patternBytes.length + 127;
            if (versionIdx === -1) return null;
            const nextZero = scanForPattern(gameManagersBytes, new Uint8Array([0]), versionIdx);
            if (nextZero === -1) return null;
            const versionBytes = gameManagersBytes.slice(versionIdx, nextZero);
            return new TextDecoder().decode(versionBytes);
        }
        return null;
    }

    async function getSteamPath() {
        const registryInstallationPath = await invoke<string>("get_steam_registry_install_location");
        if (await isSteamInstalledHere(registryInstallationPath)) {
            return registryInstallationPath;
        }
        
        for (const steamLocation of knownSteamLocations) {
            if (await isSteamInstalledHere(steamLocation)) {
                return steamLocation;
            }
        }

        return null;
    }

    async function findAmongUsPath() {
        const baseSteamPath = await getSteamPath();
        if (baseSteamPath !== null) {
            const baseAmongUsPath = await path.join(baseSteamPath, "steamapps", "common", "Among Us");
            if (await fs.exists(baseAmongUsPath)) {
                selectedAmongUsPath = baseAmongUsPath;
                return;
            }
        }

        selectedAmongUsPathError = "Couldn't automatically find your local installation. Locate it using the button above.";
    }

    async function locateAmongUsPath() {
        selectedAmongUsPathError = null;

        hasFolderDialogueOpen = true;
        const amongUsFolderPath = await dialog.open({
            directory: true,
            multiple: false,
            defaultPath: selectedAmongUsPath || undefined,
            title: "Open Among Us Path",
            recursive: true
        });
        hasFolderDialogueOpen = false;

        const resolvedPath = Array.isArray(amongUsFolderPath) ? amongUsFolderPath[0] : amongUsFolderPath;
        if (resolvedPath) {
            const installedVersion = await getAmongUsInstallationVersion(resolvedPath);
            if (installedVersion !== null) {
                if (installedVersion.trim() !== requiredVersion) {
                    selectedAmongUsPathError = `You have version ${installedVersion} installed, but Polus.GG: Rewritten requires version ${requiredVersion}.`;
                    return;
                } else {
                    selectedAmongUsPath = resolvedPath;
                }
            } else {
                selectedAmongUsPathError = `Couldn't identify the version of the game, make sure it's a full installation.`;
            }
        }
    }
    
    onMount(async () => {
        await findAmongUsPath();
    });
</script>

<p class="text-text-300 italic text-xs">
    Your installed version should be the latest version of Among Us supported by Polus.GG: Rewritten,
    which is {requiredVersion}.
</p>
<div class="flex flex-col items-start gap-2">
    <div class="flex rounded-lg">
        <div class="p-2 rounded-l-lg bg-surface-100"><Folder size={14}/></div>
        <input class="outline-none flex-1 rounded-r-lg bg-surface-100 w-64 text-xs border-none font-inherit text-inherit" placeholder="Location" readonly value={selectedAmongUsPath}>
        <button class="rounded-lg bg-card-200 px-4 py-1 hover:bg-card-300 hover:text-text-300 filter border-none font-inherit text-inherit cursor-pointer" on:click={findAmongUsPath}>
            <ArrowPath size={14}/>
        </button>
    </div>
    <button class="rounded-lg bg-card-200 px-4 py-1 hover:bg-card-300 hover:text-text-300 filter border-none font-inherit text-inherit cursor-pointer"
        class:grayscale={hasFolderDialogueOpen}
        class:pointer-events-none={hasFolderDialogueOpen}
        on:click={locateAmongUsPath}
    >
        Open Folder
    </button>
    {#if selectedAmongUsPathError !== null}
        <p class="text-yellow-500 my-0.5 text-xs">{@html selectedAmongUsPathError}</p>
    {/if}
</div>