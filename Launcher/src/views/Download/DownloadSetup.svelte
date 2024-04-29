<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import Adjustments from "../../icons/Adjustments.svelte";
    import DropDown from "../../components/DropDown.svelte";
    import SteamDownloadSetup from "./SteamDownloadSetup.svelte";
    import SteamAuth from "./SteamAuth.svelte";
    import EpicGamesDownloadSetup from "./EpicGamesDownloadSetup.svelte";
    import LocalInstallationSetup from "./LocalInstallationSetup.svelte";

    export let steamAuthModal: SteamAuth;
    export let isVisible = false;

    const dispatchEvent = createEventDispatcher();

    const platforms = [ "Steam", "Epic Games" ];
    let selectedDownloadPlatformIdx = -1;
    let selectedInstallationTypeIdx = -1;

    let localInstallationSetup: LocalInstallationSetup|undefined = undefined;
    let steamDownloadSetup: SteamDownloadSetup|undefined = undefined;
    let epicGamesDownloadSetup: EpicGamesDownloadSetup|undefined = undefined;

    export function show() {
        isVisible = true;
    }

    export function hide() {
        isVisible = false;
        dispatchEvent("close");
    }

    async function validateAndGetInstaller() {
        if (selectedInstallationTypeIdx === 0) {
            if (!await localInstallationSetup.validate())
                return undefined;

            return localInstallationSetup.getInstaller();
        }

        if (selectedDownloadPlatformIdx === 0) {
            if (!steamDownloadSetup)
                return undefined;

            if (!await steamDownloadSetup.validate())
                return undefined;

            return steamDownloadSetup.getInstaller();
        } else if (selectedDownloadPlatformIdx === 1) {
            return epicGamesDownloadSetup.getInstaller();
        }

        return undefined;
    }

    async function submit() {
        const installer = await validateAndGetInstaller();
        if (installer === undefined) {
            return;
        }
        hide();
        dispatchEvent("finalise-download", { installer });
    }
</script>

<div class="left-0 top-0 w-full h-full items-center justify-center bg-[#000000b5] z-10" class:flex={isVisible} class:hidden={!isVisible} class:fixed={isVisible}>
    <div class="bg-surface-200 w-1/4 h-4/7 rounded-xl shadow-lg px-6 p-4">
        <div class="flex flex-col h-full gap-2">
            <div class="flex items-center gap-2">
                <Adjustments size={20}/>
                <span class="text-lg">Download Setup</span>
            </div>
            <p class="text-text-300 italic text-xs">
                To download Polus.GG: Rewritten, you can either locate your existing installation from Steam,
                Epic Games or Itch.io, or the launcher can download it for you.
            </p>
            <span class="text-md">Do you have Among Us installed? (2023.7.11)</span>
            <DropDown items={[ "Yes", "No" ]} bind:selectedIdx={selectedInstallationTypeIdx}/>
            {#if selectedInstallationTypeIdx === 0}
                <LocalInstallationSetup bind:this={localInstallationSetup}/>
            {:else if selectedInstallationTypeIdx === 1}
                <span class="text-md">Where do you own Among Us?</span>
                <DropDown items={platforms} bind:selectedIdx={selectedDownloadPlatformIdx}/>
                {#if selectedDownloadPlatformIdx === 0}
                    <SteamDownloadSetup {steamAuthModal} bind:this={steamDownloadSetup}/>
                {:else if selectedDownloadPlatformIdx === 1}
                    <EpicGamesDownloadSetup bind:this={epicGamesDownloadSetup}/>
                {:else}
                    <p class="text-text-300 italic text-xs">
                        Select which platform you have purchased Among Us.
                    </p>
                {/if}
            {/if}
            {#if selectedInstallationTypeIdx !== -1}
                <div class="mt-auto self-end flex gap-2">
                    <button class="rounded-lg border-2 bg-transparent border-card-200 px-4 py-1 hover:text-text-300 filter border-none font-inherit text-inherit cursor-pointer" on:click={hide}>
                        Cancel
                    </button>
                    <button class="rounded-lg bg-card-200 px-4 py-1 hover:bg-card-300 hover:text-text-300 filter border-none font-inherit text-inherit cursor-pointer"
                        on:click={submit}
                    >
                        Begin Download
                    </button>
                </div>
            {/if}
        </div>
    </div>
</div>