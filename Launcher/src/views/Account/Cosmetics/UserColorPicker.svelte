<script lang="ts">
    import { createEventDispatcher } from "svelte";
    const dispatchEvent = createEventDispatcher();

    import * as audata from "@skeldjs/data";
    import * as amongus from "@skeldjs/constant";

    export let playerColor: amongus.Color|null;
</script>

<div class="flex flex-col items-start">
    <div class="flex flex-wrap max-w-4/5">
        {#each Object.entries(audata.ColorCodes) as [ colorId, color ]}
            <button
                class="p-0.5 border-2 rounded-lg"
                class:border-transparent={parseInt(colorId) !== playerColor}
                class:hover:border-text-300={parseInt(colorId) !== playerColor}
                class:border-text-200={parseInt(colorId) === playerColor}
                on:click={() => dispatchEvent("wear-color", parseInt(colorId))}>
                <div class="w-8 h-8 rounded-lg" style="background: linear-gradient(45deg, #{color.shadowHex} 0%, #{color.shadowHex} 30%, #{color.highlightHex} 70%, #{color.highlightHex} 100%)">
    
                </div>
            </button>
        {/each}
    </div>
</div>