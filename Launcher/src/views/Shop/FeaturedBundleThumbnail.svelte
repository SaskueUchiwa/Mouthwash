<script lang="ts">
    import CheckBadge from "../../icons/CheckBadge.svelte";
    import type { Bundle } from "../../stores/accounts";

    export let bundleInfo: Bundle;
    export let ownedItems: Bundle[]|undefined;
    export let size: number;
    export let showDetails: boolean;

    $: doesAlreadyOwn = ownedItems && ownedItems.find(x => x.id === bundleInfo.id);
</script>

<button class="relative filter hover:contrast-120 group transition duration-500 rounded-md overflow-hidden" class:pointer-events-none={!showDetails} on:click>
    <div class="filter transition duration-500 transform group-hover:scale-110" style="width: {size}px; height: {size}px;" class:grayscale={doesAlreadyOwn}>
        <img src={bundleInfo.thumbnail_url} width={size} height={size} alt={bundleInfo.name}/>
    </div>
    {#if showDetails}
        <!--{#if bundleInfo.bundle_feature_tags && bundleInfo.bundle_feature_tags.includes("NEW_RELEASE")}
            <div class="absolute left-0 top-0">
                <img src="/new-dog-ear.png" alt="new release">
            </div>
        {/if}-->
        {#if doesAlreadyOwn}
            <div class="absolute left-0 bottom-0 w-full h-8 flex items-center justify-center bg-accent/95 text-white">
                <div class="flex gap-1">
                    <CheckBadge size={16}/>
                    <span class="text-sm">Purchased</span>
                </div>
            </div>
        {:else}
            <div class="absolute left-0 bottom-0 w-full py-1.5 flex items-center justify-center bg-black/60 text-white">
                <div class="flex flex-col">
                    <span class="text-sm px-1">{bundleInfo.name} ({bundleInfo.num_items} item{bundleInfo.num_items === 1 ? "" : "s"})</span>
                    <!--{#if bundleInfo.bundle_feature_tags && bundleInfo.bundle_feature_tags.includes("NEW_RELEASE")}
                        <span class="text-xs font-semibold text-red-200">New Release</span>
                    {/if}-->
                </div>
            </div>
        {/if}
    {/if}
</button>