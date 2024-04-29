<script lang="ts">
    import * as shell from "@tauri-apps/api/shell";
    import * as path from "@tauri-apps/api/path";

    import Cog from "../../icons/Cog.svelte";
    import { accountUrl, loading, unavailable, user } from "../../stores/accounts";
    import UpdateOrPlay from "./UpdateOrPlay.svelte";
    import { amongUsProcess, gameInstalledPathState } from "../../stores/gameState";
    import PlaySettings from "./PlaySettings.svelte";

    let settingsOpen = false;
    $: notLoggedIn = $user === unavailable || $user === loading;

    let playSettings: PlaySettings;

    type GameServerRegionIPString = `${number}.${number}.${number}.${number}`
    type GameServerRegionString = `${string};${string};${GameServerRegionIPString};${number};`;

    function parseRegions(serverRegionsString: string) {
        const serverRegionStrings = serverRegionsString.split(",") as GameServerRegionString[];
        const serverRegions = [];
        for (const serverRegionString of serverRegionStrings) {
            const [ name, domain, ip, port ] = serverRegionString.split(";");
            if (name && domain && ip && port && parseInt(port)) {
                serverRegions.push({
                    name,
                    domain,
                    ip,
                    port: parseInt(port)
                });
            } else {
                console.log("Invalid game region string: %s", serverRegionString);
            }
        }
        return serverRegions;
    }

    async function launchGame() {
        if ($gameInstalledPathState === unavailable || $gameInstalledPathState === loading)
            return;

        if ($user === unavailable || $user === loading)
            return;

        const apiInfo = {
            ClientIdString: $user.id,
            ClientToken: $user.client_token,
            DisplayName: $user.display_name,
            LoggedInDateTime: $user.logged_in_at,
            Perks: []
        };

        const amongUsExe = await path.join($gameInstalledPathState, "Among Us.exe");
        const command = new shell.Command("cmd", [ "/C", amongUsExe ], {
            env: {
                MWGG_LOGIN_TOKEN: btoa(JSON.stringify(apiInfo || null)),
                MWGG_CONFIG: btoa(JSON.stringify({
                    accounts_url: $accountUrl,
                    server_regions: parseRegions(import.meta.env.VITE_MWGG_GAME_SERVER_REGIONS)
                }))
            }
        });
        amongUsProcess.set(await command.spawn());

        command.on("close", () => {
            amongUsProcess.set(unavailable);
        });
    }
</script>

<div class="flex gap-4 self-stretch h-full">
    <div class="w-full flex flex-col bg-base-200 rounded-xl gap-4">
        <div class="flex-[3_0_0] w-full bg-card-200 rounded-t-xl" style="background-image: url('https://placekitten.com/1080/439')"></div>
        <div class="flex-1 flex flex-col items-center justify-center">
            <div class="flex border-2 border-transparent rounded-lg">
                <UpdateOrPlay on:launch-game={launchGame}/>
                <button class="flex items-center justify-center rounded-r-lg bg-card-200 p-4 hover:bg-card-300 hover:text-text-300 filter border-none font-inherit text-inherit cursor-pointer"
                    class:grayscale={settingsOpen}
                    class:pointer-events-none={settingsOpen}
                    on:click={() => playSettings.open()}
                >
                    <Cog size={20}/>
                </button>
            </div>
            {#if notLoggedIn}
                <p class="text-yellow-500 my-0.5 text-xs">You need to be logged in before you can play.</p>
            {/if}
        </div>
    </div>
</div>
<PlaySettings bind:isVisible={settingsOpen} bind:this={playSettings} on:switch-view/>