<script lang="ts">
    import { createEventDispatcher } from "svelte";
    const dispatchEvent = createEventDispatcher();
</script>

<button class="fixed left-0 top-0 w-full h-full flex items-center justify-center bg-[#000000b5] z-10" on:click={() => dispatchEvent("close")}>
    <div class="bg-surface-200 w-1/4 rounded-xl shadow-lg px-6 p-4">
        <div class="flex flex-col items-start h-full gap-4">
            <div class="flex flex-col items-start gap-2">
                <span class="text-xl">Install Instructions</span>
                <p class="text-text-300 text-left text-sm">
                    The TownOfUs ReImagined launcher should have started its download now. If not, refresh the page
                    and try again.
                </p>
            </div>
        </div>
    </div>
</button>