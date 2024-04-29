<script lang="ts">
    import { onDestroy } from "svelte";

    export let items: string[];
    export let selectedIdx: number;

    let isOpen = false;

    function openDropdown(ev: MouseEvent) {
        isOpen = true;
        ev.stopPropagation();
        document.addEventListener("click", onDocumentClick);
    }

    function closeDropdown() {
        isOpen = false;
        document.removeEventListener("click", onDocumentClick);
    }

    function onDocumentClick(ev: MouseEvent) {
        closeDropdown();
    }

    onDestroy(() => {
        closeDropdown();
    });

    function selectItem(idx: number) {
        selectedIdx = idx;
        closeDropdown();
    }
</script>

<div class="relative w-full">
    <button class="rounded-lg w-full bg-card-200 px-4 py-1 hover:bg-card-300 hover:text-text-300 filter border-none font-inherit text-inherit cursor-pointer" class:bg-card-300={isOpen} on:click={openDropdown}>
        {#if selectedIdx === -1}
            Click to Select
        {:else}
            {items[selectedIdx]}
        {/if}
    </button>
    <button class="absolute w-full left-0 top-full shadow-lg rounded-b-lg overflow-hidden text-inherit cursor-pointer p-0" class:hidden={!isOpen} on:click={ev => ev.stopPropagation()}>
        {#each items as item, i}
            <button
                class="w-full border-[#1a0428] bg-card-200 px-4 py-1 hover:bg-card-300 hover:text-text-300 filter border-none font-inherit text-inherit cursor-pointer"
                on:click={() => selectItem(i)}
                class:border-t-1={i !== 0}
                class:border-t-2={i === 0}
                class:border-b-1={i !== items.length - 1}
            >
                {item}
            </button>
        {/each}
    </button>
</div>