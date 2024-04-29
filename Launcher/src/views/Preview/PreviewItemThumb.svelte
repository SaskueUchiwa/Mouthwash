<script lang="ts">
    import * as amongus from "@skeldjs/constant";
    import { createEventDispatcher } from "svelte";
    const dispatchEvent = createEventDispatcher();

    import type { LoadedCosmeticImages } from "../../lib/previewTypes";
    import ItemCanvas from "./ItemCanvas.svelte";

    export let cosmeticImage: LoadedCosmeticImages;
    export let searchTerm: string;
    export let selectedItemId: string|null;
    export let thumbScale: number;
    export let size = 76;
    export let playerColor: amongus.Color;

    function wearItem() {
        if (selectedItemId === null)
            return;
        dispatchEvent("wear-item", cosmeticImage);
        selectedItemId = cosmeticImage.asset.product_id;
    }

    let offset: { x: number; y: number; } = { x: 0, y: 0 };
    $: if (cosmeticImage.asset.type === "HAT") {
        offset = { x: cosmeticImage.asset.chip_offset.x * 100, y: 15 - cosmeticImage.asset.chip_offset.y * 100 };
    } else if (cosmeticImage.asset.type === "SKIN") {
        offset = { x: cosmeticImage.asset.chip_offset.x * 100, y: -10 - cosmeticImage.asset.chip_offset.y * 100 };
    } else if (cosmeticImage.asset.type === "VISOR") {
        offset = { x: cosmeticImage.asset.chip_offset.x * 100, y: -5 - cosmeticImage.asset.chip_offset.y * 100 };
    }
</script>

<button
    class="border-2 rounded-lg group overflow-hidden"
    class:pointer-events-none={selectedItemId === null}
    class:hidden={searchTerm !== "" && !cosmeticImage.asset.product_id.replace(/\W/g, "").toLowerCase().includes(searchTerm.replace(/\W/g, "").toLowerCase())}
    class:border-card-200={selectedItemId === null || selectedItemId !== cosmeticImage.asset.product_id}
    class:bg-surface-200={selectedItemId === null || selectedItemId !== cosmeticImage.asset.product_id}
    class:border-text-300={selectedItemId !== null && selectedItemId === cosmeticImage.asset.product_id}
    class:bg-surface-100={selectedItemId !== null && selectedItemId === cosmeticImage.asset.product_id}
    style="aspect-ratio: 1/1; width: {size}px; height: {size}px;"
    on:click={wearItem}
    title={cosmeticImage.asset.product_id}>
    <div class="transition duration-250 transform group-hover:scale-115 w-full h-full">
        <ItemCanvas
            layers={[ { ...cosmeticImage.thumb, scale: thumbScale } ]}
            {offset}
            {playerColor}
            />
    </div>
</button>