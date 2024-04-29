<script lang="ts">
    import "virtual:windi.css";

    import * as fs from "@tauri-apps/api/fs";
    import * as path from "@tauri-apps/api/path";
    import { onMount } from "svelte";
    import Tab from "./components/Tab.svelte";
    import TabList from "./components/TabList.svelte";

    import Account from "./icons/Account.svelte";
    import Download from "./icons/Download.svelte";
    import Shop from "./icons/Shop.svelte";

    import AccountView from "./views/Account/Account.svelte";
    import DownloadView from "./views/Download/Download.svelte";
    import PlayView from "./views/Play/Play.svelte";
    import ShopView from "./views/Shop/Shop.svelte";
    import { gameInstalledPathState, gameRemoteVersionState, type ChangeLogEntry, gameInstalledVersionState } from "./stores/gameState";
    import { loading, unavailable } from "./stores/accounts";
    import Launch from "./icons/Launch.svelte";
    import Loader from "./icons/Loader.svelte";

    let selectedTab = "Account";

    let accountTabView: AccountView|undefined = undefined;

    const requiredFiles = [ "Among Us_Data", "Among Us_Data/il2cpp_data", "BepInEx", "BepInEx/core", "BepInEx/plugins/Polus.dll", "BepInEx/plugins/PolusggSlim.dll",
        "dotnet", "Among Us.exe", "baselib.dll", "doorstop_config.ini", "GameAssembly.dll", "UnityPlayer.dll", "winhttp.dll" ];
    async function checkInstallationPath(installationPath: string) {
        // for (const requiredFile of requiredFiles) {
        //     if (!await fs.exists(await path.join(installationPath, requiredFile))) {
        //         console.log("Missing file %s in installation", requiredFile);
        //         return false;
        //     }
        // }

        return true;
    }

    async function getRemoteLatestVersion() {
        try {
            const changelogRes = await fetch("https://ndekzjeeffavjzlmmupt.supabase.co/storage/v1/object/public/Downloads/changelog.json");

            if (!changelogRes.ok) {
                gameRemoteVersionState.set(new Error("Could not get latest version, contact support. Status: " + changelogRes.status));
                return;
            }

            const json = await changelogRes.json() as ChangeLogEntry[];
            let latestRelease: ChangeLogEntry|undefined = undefined;
            for (const entry of json) {
                if (!latestRelease) {
                    latestRelease = entry;
                    continue;
                }

                if (new Date(entry.date_released).getTime() > new Date(latestRelease.date_released).getTime()) {
                    latestRelease = entry;
                }
            }
            if (latestRelease === undefined) {
                gameRemoteVersionState.set(unavailable);
                return;
            }
            gameRemoteVersionState.set(latestRelease);
        } catch (e: any) {
            gameRemoteVersionState.set(new Error("Could not get latest version, check your internet connection"));
            return;
        }
    }

    async function getInstallationPath() {
        gameInstalledPathState.set(loading);
        const installedPath = localStorage.getItem("installation-path");
        if (installedPath === null) {
            gameInstalledPathState.set(unavailable);
            return;
        }

        if (await checkInstallationPath(installedPath)) {
            gameInstalledPathState.set(installedPath);
            return;
        }
        
        gameInstalledPathState.set(unavailable);
    }

    async function getLocalVersion() {
        gameInstalledVersionState.set(loading);
        const installedVersion = localStorage.getItem("installation-version");
        if (installedVersion === null) {
            gameInstalledVersionState.set(unavailable);
            return;
        }

        gameInstalledVersionState.set(installedVersion);
    }

    function switchView(ev: CustomEvent<{ view: string; }>) {
        selectedTab = ev.detail.view;
    }

    onMount(async () => {
        await Promise.all([ getInstallationPath(), getRemoteLatestVersion(), getLocalVersion() ]);
    });

    let basisElement: HTMLDivElement|undefined;
    let contentElement: HTMLDivElement|undefined;

    function onFrame() {
        if (basisElement && contentElement) {
            const bounds = basisElement.getBoundingClientRect();
            contentElement.style.width = bounds.width + "px";
        }
        requestAnimationFrame(onFrame);
    }

    requestAnimationFrame(onFrame);
</script>

<div class="min-h-0 w-full flex flex-col items-center p-y-32">
    <div class="min-h-0 h-full flex flex-col gap-16 items-center self-center">
        <div class="flex flex-col gap-4 items-center" bind:this={basisElement}>
            <div><span class="font-bold text-text-100 text-6xl">Polus.gg</span>&nbsp;&nbsp;<span class="italic text-text-100 text-6xl">Rewritten</span></div>
            <span class="w-128 xl:w-248 text-xl">
                A revival of the original Polus.GG mod for Among Us - a private server and client mod with
                brand new gamemodes, cosmetics and roles, unleashing thousands of new ways to play.
            </span>
        </div>
        <div class="min-h-0 flex-1 self-stretch" bind:this={contentElement}>
            <div class="w-full h-full" class:hidden={selectedTab !== "Account"}><AccountView bind:this={accountTabView} on:switch-view={switchView}/></div>
            <div class="w-full h-full" class:hidden={selectedTab !== "Download"}><DownloadView on:switch-view={switchView}/></div>
            <div class="w-full h-full" class:hidden={selectedTab !== "Play"}><PlayView on:switch-view={switchView}/></div>
            <div class="w-full h-full" class:hidden={selectedTab !== "Shop"}>
                <ShopView
                    on:refresh-cosmetics={() => accountTabView?.getUserCosmetics()}
                    on:open-bundle={ev => accountTabView?.openBundle(ev.detail)}
                    on:switch-view={switchView}/>
                </div>
        </div>
    </div>
</div>
<div class="absolute left-0 top-1/2 -translate-y-1/2 transform">
    <TabList>
        <Tab name="Account" idx={1} bind:selectedTab><Account size={26} slot="icon"/></Tab>
        {#if $gameInstalledPathState === loading}
            <Tab name="Loading" idx={2} bind:selectedTab><Loader size={26} slot="icon"/></Tab>
        {:else if $gameInstalledPathState === unavailable}
            <Tab name="Download" idx={2} bind:selectedTab><Download size={26} slot="icon"/></Tab>
        {:else}
            <Tab name="Play" idx={2} bind:selectedTab><Launch size={26} slot="icon"/></Tab>
        {/if}
        <Tab name="Shop" idx={3} bind:selectedTab><Shop size={26} slot="icon"/></Tab>
    </TabList>
</div>

<style windi:preflights:global windi:safelist:global>
    :global(html, body, #app) {
        background-color: #0c0213;
        margin: 0;
        padding: 0;
        width: 100vw;
        height: 100vh;
        font-family: "Josefin Sans", sans-serif;
        color: #e4c8f9;
    }

    :global(#app) {
        display: flex;
        align-items: stretch;
    }

    :global(*) {
        --un-blur: blur(0);
        --un-brightness: brightness(1);
        --un-contrast: contrast(1);
        --un-drop-shadow: drop-shadow(0px 0px);
        --un-hue-rotate: hue-rotate(0);
        --un-invert: invert(0);
        --un-saturate: saturate(0);
        --un-sepia: sepia(0);
    }
</style>
