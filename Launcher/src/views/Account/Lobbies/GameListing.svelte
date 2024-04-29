<script lang="ts">
    import { writable } from "svelte/store";
    import ChevronDown from "../../../icons/ChevronDown.svelte";
    import ChevronUp from "../../../icons/ChevronUp.svelte";
    import { unavailable, type GameLobbyInfo, type Player, loading, accountUrl, type UserLogin } from "../../../stores/accounts";
    import Loader from "../../../icons/Loader.svelte";
    import PlayCircle from "../../../icons/PlayCircle.svelte";
    import PlayerListing from "./PlayerListing.svelte";
    import { onMount } from "svelte";

    export let user: UserLogin;
    export let game: GameLobbyInfo;
    export let selectedGameId: string|undefined;

    const map = game.game_settings?.[".Map"]?.options[game.game_settings?.[".Map"]?.selectedIdx];
    const gamemode = game.game_settings?.[".Gamemode"]?.options[game.game_settings?.[".Gamemode"]?.selectedIdx];
    
    const startedAtFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
    
    let players = writable<typeof unavailable|typeof loading|Player[]>(unavailable);

    async function selectOrDeselect() {
        if (selectedGameId === game.id) {
            selectedGameId = undefined;
            return;
        }

        selectedGameId = game.id;
        if ($players === unavailable) {
            await getPlayers();
        }
    }

    async function getPlayers() {
        players.set(loading);

        const responsePlayers = await fetch($accountUrl + `/api/v2/games/${game.id}/players`);

        if (!responsePlayers.ok) {
            try {
                const json = await responsePlayers.json();
                console.error(json);
            } catch (e: any) {
                console.error(e);
            }
            players.set(unavailable);
            return;
        }
        const json = await responsePlayers.json();
        if (json.success) {
            game.total_players = json.data.length;
            players.set(json.data);
        } else {
            console.error(json);
            players.set(unavailable);
        }
    }

    onMount(async () => {
        if (selectedGameId === game.id) {
            await getPlayers();
        }
    });
</script>

<button class="flex flex-col items-stretch gap-2 bg-surface-200 px-4 py-2 rounded-lg cursor-pointer" on:click={selectOrDeselect}>
    <div class="flex items-center gap-4">
        <div class="flex flex-col items-start">
            <div class="flex items-center gap-2">
                <span>{map || "The Skeld"}</span>
                <span class="text-xs px-2 py-0.5 rounded-xl bg-accent2">{gamemode || "Hide N' Seek"}</span>
                {#if game.total_players !== undefined}
                    <span class="text-xs px-2 py-0.5 rounded-xl bg-card-100">{game.total_players} Player{game.total_players === 1 ? "" : "s"}</span>
                {/if}
            </div>
            {#if game.ended_at !== null}
                {@const durationMinutes = Math.ceil((new Date(game.ended_at).getTime() - new Date(game.started_at).getTime()) / 1000 / 60)}
                <span class="text-xs text-text-300 italic">
                    Played on {startedAtFormat.format(new Date(game.started_at))} for {durationMinutes} minute{durationMinutes === 1 ? "" : "s"}
                </span>
            {:else}
                <div class="text-red-500 animate-pulse flex gap-1 items-center">
                    <PlayCircle size={16}/>
                    <span class="text-xs">Playing currently</span>
                </div>
            {/if}
        </div>
        <div class="ml-auto order-2 flex items-center gap-4">
            {#if game.did_win !== null}
                {#if game.did_win}
                    <div class="flex items-center gap-1">
                        <div class="bg-green-400 rounded-full w-2 h-2"></div>
                        <span class="text-xs font-semibold text-green-400">WON</span>
                    </div>
                {:else}
                    <div class="flex items-center gap-1">
                        <div class="border-red-400 border-2 rounded-full w-2 h-2"></div>
                        <span class="text-xs font-semibold text-red-400">LOST</span>
                    </div>
                {/if}
            {/if}
            <div class="bg-card-200 rounded-full">
                {#if selectedGameId === game.id}
                    <ChevronUp size={16}/>
                {:else}
                    <ChevronDown size={16}/>
                {/if}
            </div>
        </div>
    </div>
    <div class:hidden={selectedGameId !== game.id}>
        {#if $players === loading}
            <div class="flex items-center justify-center">
                <Loader size={20}/>
            </div>
        {:else if $players === unavailable}
            <p>Couldn't get players in this game.</p>
        {:else}
            {#if game.ended_at === null}
                <div class="flex flex-col items-start px-2 mb-2 gap-2">
                    <span class="font-semibold">Players</span>
                    <div class="grid grid-cols-3 self-stretch px-2 grid-rows-auto gap-1">
                        {#each $players as player}
                            <PlayerListing {user} {player}/>
                        {/each}
                    </div>
                </div>
            {:else}
                {@const winners = $players.filter(a => a.did_win)}
                {@const losers = $players.filter(a => !a.did_win)}
                <div class="flex flex-col items-start px-2 mb-2 gap-2">
                    {#if winners.length > 0}
                        <span class="font-semibold">Won</span>
                        <div class="grid grid-cols-3 self-stretch px-2 grid-rows-auto gap-1">
                            {#each winners as player}
                                <PlayerListing {user} {player}/>
                            {/each}
                        </div>
                    {/if}
                    {#if losers.length > 0}
                        <span class="font-semibold">Lost</span>
                        <div class="grid grid-cols-3 self-stretch px-2 grid-rows-auto gap-1">
                            {#each losers as player}
                                <PlayerListing {user} {player}/>
                            {/each}
                        </div>
                    {/if}
                </div>
            {/if}
        {/if}
    </div>
</button>