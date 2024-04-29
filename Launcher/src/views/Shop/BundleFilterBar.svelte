<script lang="ts">
    import { loading, unavailable, type Bundle } from "../../stores/accounts";
    import Search from "../../icons/Search.svelte";
    import type { Writable } from "svelte/store";

    export let availableBundles: Writable<Bundle[]|typeof loading|typeof unavailable>;
    // export let selectedValuationIdxs: number[];
    export let searchTerm: string;
    export let getAvailableCosmetics: () => void;
</script>

<div class="flex items-center border-b-1 pb-2 mb-1 border-white/20 gap-2">
    {#if $availableBundles !== unavailable && $availableBundles !== loading}
        <span class="text-xs">Showing {$availableBundles.length} bundle{$availableBundles.length === 1 ? "" : "s"}</span>
    {/if}
    <div class="ml-auto order-2">
        <div class="flex gap-1">
            <!--<ValuationDropdown bind:selectedIdxs={selectedValuationIdxs} items={["Ghost", "Crewmate", "Impostor", "Polus"]} small={true}/>-->
            <div class="flex border-transparent rounded-lg">
                <div class="p-2 bg-card-200 rounded-l-lg"><Search size={14}/></div>
                <input
                    class="border-none font-inherit text-inherit text-xs outline-none rounded-r-lg bg-card-200 w-64"
                    placeholder="Search name, description, items, etc."
                    on:keypress={ev => ev.key === "Enter" && getAvailableCosmetics()}
                    bind:value={searchTerm}>
            </div>
            <button class="text-xs rounded-lg bg-card-200 px-4 py-1 hover:bg-card-300 hover:text-text-300 filter border-none font-inherit cursor-pointer"
                class:grayscale={$availableBundles === loading}
                class:pointer-events-none={$availableBundles === loading}
                on:click={getAvailableCosmetics}
            >
                Go
            </button>
        </div>
    </div>
</div>