<script lang="ts">
    import * as amongus from "@skeldjs/constant";
    import type { Player, UserLogin } from "../../../stores/accounts";
    import ItemCanvas from "../../Preview/ItemCanvas.svelte";

    export let user: UserLogin;
    export let player: Player;

    const playerHeadImg = new Image;
    playerHeadImg.src = "/no-color-au-head.webp";
</script>

<div class="flex items-center gap-2 max-w-35">
    <div class="w-4 h-4">
        <ItemCanvas
            layers={[ { img: playerHeadImg, material: "player", pivot: { x: 0, y: 0 }, scale: 1 } ]}
            playerColor={player.cosmetic_color || amongus.Color.Red}
            offset={ { x: 0, y: 0 }}/>
    </div>
    <span
        class="text-xs flex flex-wrap justify-center"
        class:text-red-400={player.role_alignment === "Impostor"}
        class:text-blue-400={player.role_alignment === "Crewmate"}
        class:text-gray={player.role_alignment === "Neutral"}
        class:font-bold={player.user_id === user.id}
    >
        <span class="block truncate max-w-35">{player.cosmetic_name || "Some player"}</span>
        {#if player.role_name !== undefined}
            &nbsp;({player.role_name || "Crewmate"})
        {/if}
    </span>
</div>