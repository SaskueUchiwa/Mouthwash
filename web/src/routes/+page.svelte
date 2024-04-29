<script lang="ts">
    import DownloadSmall from "../icons/DownloadSmall.svelte";
    import DownloadedLauncherInstructionsPopup from "./DownloadedLauncherInstructionsPopup.svelte";
    export let data;

    let postDownloadInstructionsOpen = false;
</script>

<div class="flex flex-col items-center px-4 md:px-0 gap-16">
    <div class=" rounded-full flex flex-col md:flex-row items-center gap-4">
        <img src="/polus.png" class="w-24 md:w-32" alt="polus icon"/>
        <div class="flex flex-col items-center md:items-stretch">
            <span class="text-4xl md:text-6xl"><span class="font-bold">TownOfUs :</span>&nbsp;<span class="italic">ReImagined</span></span>
           <!-- <p class="text-xs md:text-md max-w-144">
                A revival of the original Polus.GG mod for Among Us - a private server and client mod
                with brand new gamemodes, cosmetics and roles, unleashing thousands of new ways to play.
            </p>
            -->
              <p class="text-xs md:text-md max-w-144">
               Town of Us ReImagined an major edited version of town of us mod with brand new roles, cosmetics shop servern account System and features + Execlusive Launcher, unleashing thousands of new ways to play.
            </p>
        </div>
    </div>
    <a
        class="flex items-center justify-center rounded-full px-6 py-4 bg-card-200 hover:bg-[#f00e0e] hover:text-text-300 filter border-none font-inherit text-inherit cursor-pointer transition-colors duration-150"
        href="{import.meta.env.VITE_SUPABASE_BASE_API_URL}/storage/v1/object/public/Downloads/launcher {data.launcherRelease.version}.msi"
        target="_blank"
        on:click={() => postDownloadInstructionsOpen = true}
    >
        <div class="flex items-center gap-2">
            <DownloadSmall size={20}/>
            <div class="flex flex-col items-start">
                <span class="text-xl leading-5">Download launcher</span>
                <span class="flex items-center text-text-300 text-xs leading-3 italic">
                    {data.launcherRelease.version}, Windows x64
                </span>
            </div>
        </div>
    </a>
</div>

{#if postDownloadInstructionsOpen}
    <DownloadedLauncherInstructionsPopup on:close={() => postDownloadInstructionsOpen = false}/>
{/if}
