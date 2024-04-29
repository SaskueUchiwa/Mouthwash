<script lang="ts">
    import * as amongus from "@skeldjs/constant";
    import { writable } from "svelte/store";
    import BundleFilterBar from "./BundleFilterBar.svelte";
    import { loading, type Bundle, unavailable, accountUrl, user } from "../../stores/accounts";
    import BuyableCosmeticBundle from "./BuyableCosmeticBundle.svelte";
    import { onMount } from "svelte";
    import Loader from "../../icons/Loader.svelte";

    export let ownedBundles: Bundle[]|undefined;
    export let page: String;
    export let selectedValuationIdxs: number[];
    export let searchTerm: string;
    export let featureTag: string|undefined;
    export let allFeatureTags: Record<string, string>;
    
    const allValuations = [ "GHOST", "CREWMATE", "IMPOSTOR", "POLUS" ];

    let availableBundles = writable<Bundle[]|typeof loading|typeof unavailable>(loading);

    export async function getAvailableCosmetics() {
        availableBundles.set(loading);
        const userCosmeticsRes = await fetch($accountUrl + "/api/v2/bundles?"
            + (searchTerm.length > 0 ? "text_search=" + searchTerm : "")
            + (selectedValuationIdxs.length > 0 ? "&valuations=" + selectedValuationIdxs.map(i => allValuations[i]).join(",") : "")
            + (featureTag !== undefined ? "&feature_tag=" + featureTag : ""));

        if (!userCosmeticsRes.ok) {
            availableBundles.set(unavailable);
            return;
        }

        const json = await userCosmeticsRes.json();
        availableBundles.set(json.data);
    }

    onMount(() => {
        getAvailableCosmetics();
    });
</script>

<div class="flex flex-col gap-4 min-h-0">
    <div class="flex gap-2">
        <button class="text-xs rounded-lg bg-card-200 px-4 py-1 hover:bg-card-300 hover:text-text-300 filter border-none font-inherit cursor-pointer"
            on:click={() => page = ""}
        >
            Back to Shop
        </button>
    </div>
    <span class="text-xl">
        Marketplace
        {#if featureTag !== undefined}
            ({allFeatureTags[featureTag]} Bundles)
        {:else}
            (All Bundles)
        {/if}
    </span>
    <!-- <BundleFilterBar {availableBundles} {getAvailableCosmetics} bind:selectedValuationIdxs bind:searchTerm/> -->
    <BundleFilterBar {availableBundles} {getAvailableCosmetics} bind:searchTerm/>
    <div class="overflow-y-auto min-h-0 px-4 flex-1">
        {#if $availableBundles === loading}
            <div class="flex-1 flex items-center justify-center text-text-300">
                <Loader size={32}/>
            </div>
        {:else if $availableBundles === unavailable}
            Could not get bundles available to purchase, try again later or contact support.
        {:else}
            <div class="flex flex-col gap-4">
                {#each $availableBundles as bundleInfo}
                    <BuyableCosmeticBundle
                        {bundleInfo}
                        {ownedBundles}
                        playerColor={$user === loading || $user === unavailable ? amongus.Color.Red : $user.cosmetic_color}
                        on:open-purchase-form
                        on:preview-bundle/>
                {/each}
            </div>
        {/if}
    </div>
</div>