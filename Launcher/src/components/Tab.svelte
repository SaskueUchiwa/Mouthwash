<script lang="ts">
    export let name: string;
    export let idx: number;
    export let selectedTab: string;
    export let disabled = false;

    function selectThisTab() {
        selectedTab = name;
    }
</script>

<button
    class="bg-card-200 rounded-r-2xl col-start-1 col-span-2 transition-opacity hover:opacity-100 border-none cursor-pointer filter"
    class:grayscale={disabled}
    class:pointer-events-none={disabled}
    class:opacity-50={selectedTab !== name}
    style="grid-row: {idx}"
    on:click={selectThisTab}
>
</button>
<div
    class="col-start-2 py-5 px-4 flex items-center gap-2 transition-opacity pointer-events-none"
    class:opacity-50={selectedTab !== name}
    style="grid-row: {idx}"
>
    <slot name="icon"/>
    <span class="italic text-xl">{name}</span>
</div>