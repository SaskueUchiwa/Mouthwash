<script lang="ts">
    import * as amongus from "@skeldjs/constant";
    import FeaturedBundleThumbnail from "../../Shop/FeaturedBundleThumbnail.svelte";
    import PreviewItemSelection from "../../Preview/PreviewItemSelection.svelte";
    import type { Bundle } from "../../../stores/accounts";
    import Search from "../../../icons/Search.svelte";

    export let isOfficial: boolean;
    export let bundle: Bundle & { owned_at: string; };
    export let selectedItemId: string;
    export let playerColor: amongus.Color;
    export let small: boolean;

    let previewItemSelection: PreviewItemSelection|undefined;
    export function selectItem(idx: number) {
        previewItemSelection?.selectItem(idx);
    }

    let bundleSearchTerm = "";
    
    const boughtAtFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
</script>

<div class="flex flex-col border-b-1 pb-2 mb-1 border-white/20 gap-2">
    <div class="flex items-center gap-3">
        <FeaturedBundleThumbnail ownedItems={[]} bundleInfo={bundle} size={small ? 48 : 84} showDetails={false}/>
        <div class="flex-1 flex flex-col items-start gap-1">
            <span class="text-1xl">{bundle.name} Bundle</span>
            {#if !small && bundle.description.length > 0}
                <p class="text-text-300 italic text-sm text-left max-w-4/5">
                    &OpenCurlyDoubleQuote;{bundle.description}&CloseCurlyDoubleQuote;
                </p>
            {/if}
            {#if small}
                <span class="text-text-300 italic text-xs">
                    {#if bundle.owned_at === null}
                        {bundle.num_items} item{bundle.num_items === 1 ? "" : "s"}
                    {:else}
                        Bought on {boughtAtFormat.format(new Date(bundle.owned_at))}, {bundle.num_items} item{bundle.num_items === 1 ? "" : "s"}
                    {/if}
                </span>
            {/if}
        </div>
        {#if small}
            <div class="ml-auto flex border-transparent rounded-lg">
                <div class="p-2 bg-card-200 rounded-l-lg"><Search size={14}/></div>
                <input
                    class="border-none font-inherit text-inherit text-xs outline-none rounded-r-lg bg-card-200 w-64"
                    placeholder="Search"
                    bind:value={bundleSearchTerm}>
            </div>
        {/if}
    </div>
    <div class="flex items-center">
        {#if !small}
            <span class="text-text-300 italic text-sm">
                {#if bundle.owned_at === null}
                    {bundle.num_items} item{bundle.num_items === 1 ? "" : "s"}
                {:else}
                    Bought on {boughtAtFormat.format(new Date(bundle.owned_at))}, {bundle.num_items} item{bundle.num_items === 1 ? "" : "s"}
                {/if}
            </span>
            <div class="ml-auto flex border-transparent rounded-lg">
                <div class="p-2 bg-card-200 rounded-l-lg"><Search size={14}/></div>
                <input
                    class="border-none font-inherit text-inherit text-xs outline-none rounded-r-lg bg-card-200 w-64"
                    placeholder="Search"
                    bind:value={bundleSearchTerm}>
            </div>
        {/if}
    </div>
</div>
<div class="overflow-y-auto overflow-x-auto min-w-0 min-h-0 px-4 flex-1">
    <PreviewItemSelection
        {playerColor}
        bundleInfo={bundle}
        searchTerm={bundleSearchTerm}
        isOfficial={isOfficial}
        showGroups={true}
        thumbScale={isOfficial ? 3 : 1}
        itemSize={56}
        bind:selectedItemId
        on:wear-item
        on:cosmetics-ready
        bind:this={previewItemSelection}/>
</div>