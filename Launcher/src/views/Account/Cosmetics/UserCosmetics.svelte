<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    const dispatchEvent = createEventDispatcher();

    import * as amongus from "@skeldjs/constant";
    import { writable } from "svelte/store";
    import Loader from "../../../icons/Loader.svelte";
    import { accountUrl, loading, unavailable, type Bundle, user } from "../../../stores/accounts";
    import CosmeticBundle from "./CosmeticBundle.svelte";
    import ArrowRight from "../../../icons/ArrowRight.svelte";
    import BundlePreviewList from "./BundlePreviewList.svelte";

    let error = "";
    let ownedBundles = writable<(Bundle & { owned_at: string; })[]|typeof loading|typeof unavailable>(loading);

    let selectedItemId = "";
    let selectedBundleId: string|undefined = undefined;
    let bundleSearchTerm = "";

    export async function openBundle(bundleId: string) {
        selectedBundleId = bundleId;
    }

    export async function getUserCosmetics() {
        if ($user === loading || $user === unavailable)
            return;

        ownedBundles.set(loading);
        const userCosmeticsRes = await fetch($accountUrl + "/api/v2/accounts/owned_bundles", {
            headers: {
                Authorization: `Bearer ${$user.client_token}`
            }
        });

        if (!userCosmeticsRes.ok) {
            error = "Could not get user cosmetics.";
            ownedBundles.set(unavailable);
            return;
        }

        const json = await userCosmeticsRes.json();
        ownedBundles.set(json.data);
    }

    function selectBundle(bundle: Bundle & { owned_at: string; }) {
        selectedBundleId = bundle.id;
        bundleSearchTerm = "";
    }

    const officialBundle: Bundle & { preview_contents_url: string; owned_at: string|null; } = {
        id: "00000000-0000-0000-0000-000000000000",
        name: "Official",
        thumbnail_url: "/amongus-thumbnail.png",
        author_id: "",
        base_resource_id: 0,
        price_usd: 0,
        added_at: new Date,
        asset_bundle_id: "",
        stripe_item_id: "",
        valuation: "",
        tags: "",
        description: "",
        feature_tags: "",
        preview_contents_url: "/CosmeticOfficial.zip",
        preview_contents_hash: "",
        num_items: 75,
        owned_at: null
    };

    function goToShop() {
        dispatchEvent("switch-view", { view: "Shop" });
    }

    onMount(() => {
        getUserCosmetics();
    });
</script>

{#if $ownedBundles === loading}
    <div class="flex-1 flex items-center justify-center text-text-300">
        <Loader size={32}/>
    </div>
{:else}
    {#if selectedBundleId !== undefined}
        <div class="flex min-w-0 flex-col gap-4 min-h-0">
            <div class="flex gap-2">
                <button class="text-xs rounded-lg bg-card-200 px-4 py-1 hover:bg-card-300 hover:text-text-300 filter border-none font-inherit cursor-pointer"
                    on:click={() => selectedBundleId = undefined}
                >
                    Back to Cosmetics
                </button>
            </div>
            {#if Array.isArray($ownedBundles)}
                {@const bundle = selectedBundleId === officialBundle.id ? officialBundle : $ownedBundles.find(x => x.id === selectedBundleId)}
                {#if bundle}
                    <BundlePreviewList
                        small={true}
                        playerColor={$user === loading || $user === unavailable ? amongus.Color.Red : $user.cosmetic_color}
                        isOfficial={selectedBundleId === officialBundle.id}
                        {bundle}
                        bind:selectedItemId
                        on:wear-item/>
                {/if}
            {/if}
        </div>
    {/if}
    <div class="flex flex-col gap-2 min-h-0" class:hidden={selectedBundleId !== undefined}>
        <span>Owned Bundles</span>
        <p class="text-text-300 italic text-sm text-left">
            These are the bundles you've bought or otherwise own. You can change your cosmetics by clicking the bundles
            below. <button class="text-text-200" on:click={goToShop}>Visit the shop</button> to purchase more, or join
            the discord to stay tuned for exclusive events.
        </p>
        <div class="flex flex-col gap-2 min-h-0 overflow-auto w-full">
            <div class="flex flex-col gap-4">
                <CosmeticBundle bundleInfo={officialBundle} on:select-bundle={() => selectBundle(officialBundle)} on:wear-item/>
            </div>
            {#if Array.isArray($ownedBundles)}
                {#if $ownedBundles.length === 0}
                    <div class="mt-5 self-center flex flex-col items-center justify-center gap-2">
                        <p>You don't have any bundles purchased.<br>Head to the shop to show off your style.</p>
                        <button class="rounded-lg bg-card-200 px-4 py-1 hover:bg-card-300 hover:text-text-300 filter border-none font-inherit text-inherit text-inherit cursor-pointer flex items-center gap-2"
                            on:click={goToShop}
                        >
                            <span>View the Shop</span>
                            <ArrowRight size={16}/>
                        </button>
                    </div>
                {:else}
                    {#each $ownedBundles as bundleInfo}
                        <div class="flex flex-col gap-4">
                            <CosmeticBundle {bundleInfo} on:select-bundle={() => selectBundle(bundleInfo)} on:wear-item/>
                        </div>
                    {/each}
                {/if}
            {/if}
        </div>
    </div>
{/if}