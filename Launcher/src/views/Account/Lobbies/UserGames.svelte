<script lang="ts">
    import { writable } from "svelte/store";
    import { type GameLobbyInfo, type UserLogin, loading, unavailable, accountUrl } from "../../../stores/accounts";
    import Loader from "../../../icons/Loader.svelte";
    import { onMount } from "svelte";
    import ArrowPath from "../../../icons/ArrowPath.svelte";
    import UserGamesLobbyGroup from "./UserGamesLobbyGroup.svelte";

    export let user: UserLogin;
    let selectedGameId: string|undefined = undefined;
    let loadingMoreGames = false;
    let hasFoundAll = false;

    interface GameLobbyGroup {
        lobbyId: string;
        gameCode: string;
        destroyedAt: string|null;
        games: GameLobbyInfo[];
    }

    const games = writable<typeof unavailable|typeof loading|GameLobbyInfo[]>(loading);
    const groupedGames = writable<typeof unavailable|typeof loading|GameLobbyGroup[]>(loading);

    function groupGamesByLobby(games: GameLobbyInfo[]) {
        const groupedGames: GameLobbyGroup[] = [];
        for (const game of games) {
            const lastGroup = groupedGames[groupedGames.length - 1] as GameLobbyGroup|undefined;
            if (lastGroup && game.lobby_id === lastGroup.lobbyId) {
                lastGroup.games.push(game);
                continue;
            }
            groupedGames.push({ lobbyId: game.lobby_id, gameCode: game.game_code, destroyedAt: game.lobby_destroyed_at, games: [ game ] });
        }
        return groupedGames;
    }

    $: groupedGames.set(Array.isArray($games) ? groupGamesByLobby($games) : $games);

    async function getGames(after: Date) {
        const gamesResponse = await fetch($accountUrl + `/api/v2/users/${user.id}/games?limit=${10}&before=${after.toISOString()}`);

        if (!gamesResponse.ok) {
            try {
                console.error(await gamesResponse.json());
            } catch (e: any) {
                console.error(e);
            }
            return undefined;
        }

        const json = await gamesResponse.json();
        if (!json.success) {
            console.error(json);
            return undefined;
        }
        return json.data as GameLobbyInfo[];
    }

    async function getInitialGames() {
        games.set(loading);
        games.set(await getGames(new Date()) || unavailable);
        hasFoundAll = false;
        if (Array.isArray($games) && $games.length > 0) {
            selectedGameId = $games[0].id;
        } else {
            selectedGameId = undefined;
        }
    }

    async function loadNextPage() {
        if ($games === loading || $games === unavailable)
            return;

        loadingMoreGames = true;
        const lastGame = $games[$games.length - 1];
        const newGames = await getGames(lastGame ? new Date(lastGame.started_at) : new Date());
        if (newGames && newGames.length === 0) {
            hasFoundAll = true;
            loadingMoreGames = false;
            return;
        }
        games.update(g => [...(g as GameLobbyInfo[]), ...newGames]);
        loadingMoreGames = false;
    }

    onMount(async () => {
        await getInitialGames();
    });
</script>

<div class="flex items-center border-b-1 pb-2 mb-1 border-white/20">
    {#if $games !== unavailable && $games !== loading}
        <span class="text-xs">Showing {$games.length}{hasFoundAll ? "" : "+"} game{$games.length === 1 ? "" : "s"}</span>
    {/if}
    <button
        class="rounded-3xl ml-auto order-2 bg-[#26093a] text-[#eed7ff] px-4 py-1 flex text-xs items-center justify-center gap-1 transition-colors filter hover:bg-card-300 hover:text-text-300"
        class:pointer-events-none={$games === loading}
        class:grayscale={$games === loading}
        on:click={getInitialGames}
    >
        <div class:animate-spin={$groupedGames === loading}>
            <ArrowPath size={14}/>
        </div>
        <span class="italic">Refresh</span>
    </button>
</div>
{#if $groupedGames === unavailable}
    <span>Could not get games.</span>
{:else if $groupedGames === loading}
    <div class="w-full h-full flex items-center justify-center">
        <Loader size={32}/>
    </div>
{:else}
    {#if $groupedGames.length === 0}
        <span>You haven't played any games yet!</span>
    {:else}
        <div class="flex flex-col min-h-0 gap-4 overflow-y-scroll">
            {#each $groupedGames as gameGroup}
                <UserGamesLobbyGroup {user} {...gameGroup} bind:selectedGameId/>
            {/each}
            <button
                class="text-text-200 px-4 py-1 flex text-xs items-center justify-center gap-1 transition-colors filter hover:text-text-300"
                class:pointer-events-none={loadingMoreGames || hasFoundAll}
                class:grayscale={loadingMoreGames || hasFoundAll}
                on:click={loadNextPage}
            >
                {#if hasFoundAll}
                    <span class="italic">No More Games to Load</span>
                {:else}
                    <span class="italic">Load More</span>
                {/if}
            </button>
        </div>
    {/if}
{/if}