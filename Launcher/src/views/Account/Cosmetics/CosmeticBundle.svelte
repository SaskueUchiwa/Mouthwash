<script lang="ts">
    import { createEventDispatcher } from "svelte";
    const dispatchEvent = createEventDispatcher();

    import ArrowRight from "../../../icons/ArrowRight.svelte";
    import type { Bundle } from "../../../stores/accounts";
    import FeaturedBundleThumbnail from "../../Shop/FeaturedBundleThumbnail.svelte";

    export let bundleInfo: Bundle;
</script>

<button class="flex items-center gap-2 bg-surface-200 rounded-lg" on:click={() => dispatchEvent("select-bundle")}>
    <FeaturedBundleThumbnail ownedItems={[]} {bundleInfo} size={64} showDetails={false}/>
    <div class="flex flex-col items-start">
        <span>{bundleInfo.name} Bundle</span>
        <span class="text-text-300 italic text-xs">
            {bundleInfo.num_items} item{bundleInfo.num_items === 1 ? "" : "s"}
        </span>
    </div>
    <div class="ml-auto mx-4">
        <ArrowRight size={24}/>
    </div>
</button>