<script lang="ts">
    import type { GameLobbyInfo, UserLogin } from "../../../stores/accounts";
    import GameListing from "./GameListing.svelte";

    export let user: UserLogin;
    export let gameCode: string;
    export let destroyedAt: string|null;
    export let games: GameLobbyInfo[];
    export let selectedGameId: string;
    
    const lobbyClosedFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
</script>

<div class="flex flex-col mr-4">
    <div class="flex items-center gap-2">
        <div class="w-4.25 h-4.25 flex items-end justify-end">
            <div class="rounded-tl-lg border-text-300 border-l-1 border-t-1 w-3 h-3">
            </div>
        </div>
        <span class="flex-1 text-text-300 text-xs font-semibold">Lobby {gameCode} ({games.length} game{games.length === 1 ? "" : "s"})</span>
        {#if destroyedAt !== null}
            <div class="flex items-center justify-end gap-2">
                <span class="text-text-300 text-xs italic">Lobby closed at {lobbyClosedFormat.format(new Date(destroyedAt))}</span>
            </div>
        {/if}
    </div>
    <div class="flex">
        <div class="w-4.25 h-full self-stretch justify-self-stretch flex items-end justify-end">
            <div class="border-text-300 border-l-1 h-full w-3 h-full">
            </div>
        </div>
        <div class="flex-1 flex flex-col min-h-0 gap-2 mt-1">
            {#each games as game}
                <GameListing {user} {game} bind:selectedGameId/>
            {/each}
        </div>
    </div>
    <div class="flex items-center">
        <div class="w-4.25 h-4.25 flex items-start justify-end">
            <div class="rounded-bl-lg border-text-300 border-l-1 border-b-1 w-3 h-3">
            </div>
        </div>
        <div class="w-4.25 h-4.25 flex items-start justify-start">
            <div class="border-text-300 border-b-1 w-3 h-3">
            </div>
        </div>
    </div>
</div>