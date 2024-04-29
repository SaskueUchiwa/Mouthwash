<script lang="ts">
    export let successMessages: string[];
    export let errorMessages: string[];
</script>

<ul class="max-w-84 px-4 list-disc">
    {#if successMessages.length === 0}
        {#each errorMessages as errorMessage}
            <li class="text-yellow-500 my-0.5">{@html errorMessage}</li>
        {/each}
    {:else}
        {#each successMessages as successMessages}
            <li class="text-emerald-500 my-0.5">{@html successMessages}</li>
        {/each}
    {/if}
</ul>