<script lang="ts">
    import { onDestroy } from "svelte";

    export let items: string[];
    export let selectedIdxs: number[];
    export let small = false;

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
        if (selectedIdxs.indexOf(idx) > -1)
            return;

        selectedIdxs.push(idx);
        selectedIdxs = selectedIdxs.sort();
    }

    function unselectItem(idx: number) {
        const i = selectedIdxs.indexOf(idx);
        if (i > -1) {
            selectedIdxs.splice(i, 1);
            selectedIdxs = selectedIdxs.sort();
        }
    }
</script>

<div class="relative w-70">
    <button
        class="rounded-lg w-full h-full bg-card-200 px-4 py-1 hover:bg-card-300 hover:text-text-300 filter flex items-center justify-center font-inherit text-inherit gap-1 cursor-pointer"
        class:bg-card-300={isOpen}
        class:text-xs={small}
        class:rounded-b-none={isOpen}
        on:click={openDropdown}
    >
        <div class="truncate">
            {#if selectedIdxs.length === 0}
                Click to filter
            {:else}
                {selectedIdxs.map(idx => items[idx]).join(", ")}
            {/if}
        </div>
        <span>
            {#if selectedIdxs.length > 0}
                ({selectedIdxs.length})
            {/if}
        </span>
    </button>
    <button
        class="absolute w-full left-0 top-full shadow-lg rounded-b-lg overflow-hidden text-inherit cursor-pointer p-0 z-10"
        class:hidden={!isOpen}
        class:text-xs={small}
        on:click={ev => ev.stopPropagation()}
    >
        {#each items as item, i}
            <button
                class="w-full border-card-200 bg-card-200 px-4 py-1 hover:bg-card-300 hover:text-text-300 filter border-none font-inherit text-inherit cursor-pointer"
                class:bg-card-300={selectedIdxs.includes(i)}
                on:click={() => selectedIdxs.includes(i) ? unselectItem(i) : selectItem(i)}
                class:border-t-1={i !== 0}
                class:border-t-2={i === 0}
                class:border-b-1={i !== items.length - 1}
            >
                {item}
            </button>
        {/each}
    </button>
</div>