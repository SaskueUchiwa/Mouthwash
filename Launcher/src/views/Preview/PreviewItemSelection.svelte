<script lang="ts">
    import * as amongus from "@skeldjs/constant";
    import { createEventDispatcher } from "svelte";
    const dispatchEvent = createEventDispatcher();

    import type { Bundle } from "../../stores/accounts";
    import { onMount } from "svelte";
    import type { AssetsListingMetadata, LoadedCosmeticImage, LoadedCosmeticImages, SpriteFileReference } from "../../lib/previewTypes";
    import PreviewItemThumb from "./PreviewItemThumb.svelte";
    import Loader from "../../icons/Loader.svelte";
    import Plus from "../../icons/Plus.svelte";
    import { getPreviewAssetsByUrl } from "../../lib/previewAssets";

    export let bundleInfo: Bundle & { preview_contents_url: string; };
    export let selectedItemId: string|null;
    export let isOfficial: boolean;
    export let searchTerm: string;
    export let thumbScale: number;
    export let showGroups: boolean;
    export let showMax: number|null = null;
    export let itemSize = 76;
    export let playerColor: amongus.Color;
    
    export function selectItem(idx: number) {
        if (idx >= loadedCosmeticImages.length)
            return;
        
        selectedItemId = loadedCosmeticImages[idx].asset.product_id;
        dispatchEvent("wear-item", loadedCosmeticImages[idx]);
    }

    let loadedCosmeticImages: LoadedCosmeticImages[] = [];
    let groupedCosmeticImages: Record<string, LoadedCosmeticImages[]> = {};
    let loadingCosmetics = true;
    let hasMore = false;
    onMount(async () => {
        loadedCosmeticImages = await getPreviewAssetsByUrl(bundleInfo.id, bundleInfo.preview_contents_url, bundleInfo.preview_contents_hash, !isOfficial, isOfficial, showMax);
        loadingCosmetics = false;
        dispatchEvent("cosmetics-ready");
    });

    $: groupedCosmeticImages = loadedCosmeticImages.reduce<Record<string, LoadedCosmeticImages[]>>((groups, cosmeticImage) => {
        groups[cosmeticImage.asset.type] ??= [];
        groups[cosmeticImage.asset.type].push(cosmeticImage);
        return groups;
    }, { });
</script>

{#if loadingCosmetics}
    <div class="w-full h-full">
        <Loader size={32}/>
    </div>
{:else}
    {#if showGroups}
        <div class="flex flex-col gap-4">
            {#each Object.entries(groupedCosmeticImages) as [ groupType, cosmeticImages ]}
                <div class="flex flex-col items-start">
                    <span class="sticky">{groupType[0].toUpperCase() + groupType.substring(1).toLowerCase()}s</span>
                    <div class="flex gap-2 flex-wrap items-center">
                        {#each cosmeticImages as cosmeticImage}
                            <PreviewItemThumb {cosmeticImage} {searchTerm} {thumbScale} size={itemSize} {playerColor} bind:selectedItemId on:wear-item/>
                        {/each}
                        {#if hasMore}
                            <div style="width: {itemSize}px; height: {itemSize}px;" class="flex items-center justify-center text-[#160124] border-2 border-[#160124] rounded-lg">
                                <Plus size={24}/>
                            </div>
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
    {:else}
        <div class="flex gap-2 flex-wrap items-center">
            {#each Object.entries(groupedCosmeticImages) as [ groupType, cosmeticImages ]}
                {#each cosmeticImages as cosmeticImage}
                    <PreviewItemThumb {cosmeticImage} {searchTerm} {thumbScale} size={itemSize} {playerColor} bind:selectedItemId on:wear-item/>
                {/each}
            {/each}
            {#if hasMore}
                <div style="width: {itemSize}px; height: {itemSize}px;" class="flex items-center justify-center text-[#160124] border-2 border-[#160124] rounded-lg">
                    <Plus size={24}/>
                </div>
            {/if}
        </div>
    {/if}
{/if}