<script lang="ts">
    import * as amongus from "@skeldjs/constant";
    import type { LoadedCosmeticImage, LoadedCosmeticImages } from "../../lib/previewTypes";
    import ItemCanvas from "./ItemCanvas.svelte";
    import Loader from "../../icons/Loader.svelte";

    export let loading: boolean;
    export let hatCosmetic: LoadedCosmeticImages|undefined;
    export let skinCosmetic: LoadedCosmeticImages|undefined;
    export let visorCosmetic: LoadedCosmeticImages|undefined;
    export let playerColor: amongus.Color;

    const colorImage = new Image;
    colorImage.src = `/Template_Color.png`;

    $: loadedColorImage = colorImage ? { img: colorImage, material: "player", pivot: { x: 0, y: 0 }, scale: 1 } as LoadedCosmeticImage : undefined;

    let layers: LoadedCosmeticImage[] = [ loadedColorImage ];
    $: loadedColorImage, visorCosmetic, skinCosmetic, hatCosmetic, (() => {
        layers = [ loadedColorImage ];
        if (visorCosmetic) {
            layers.push(visorCosmetic.main);
        }
        if (skinCosmetic) {
            layers.push(skinCosmetic.main);
        }
        if (hatCosmetic) {
            if (hatCosmetic.asset.in_front) {
                layers.unshift(hatCosmetic.back);
                layers.push(hatCosmetic.main);
            } else {
                layers.unshift(hatCosmetic.back, hatCosmetic.main);
            }
        }
        layers = layers;
    })();
</script>

<div class="w-40 h-45 relative flex items-center justify-center">
    {#if loading}
        <Loader size={24}/>
    {:else}
        <div class="absolute w-80 h-120 -bottom-3/5 -left-1/2">
            {#key layers}
                <ItemCanvas
                    {layers} {playerColor} offset={{ x: 0, y: 0 }}/>
            {/key}
        </div>
    {/if}
</div>