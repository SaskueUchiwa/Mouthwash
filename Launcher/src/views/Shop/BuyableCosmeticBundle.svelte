<script lang="ts">
    import { createEventDispatcher } from "svelte";
    const dispatchEvent = createEventDispatcher();

    import * as amongus from "@skeldjs/constant";
    import { loading, unavailable, user, accountUrl, type Bundle } from "../../stores/accounts";
    import FeaturedBundleThumbnail from "./FeaturedBundleThumbnail.svelte";
    import PreviewItemSelection from "../Preview/PreviewItemSelection.svelte";

    export let bundleInfo: Bundle;
    export let ownedBundles: Bundle[]|undefined;
    export let playerColor: amongus.Color;
    const boughtAtFormat = new Intl.DateTimeFormat("en-US");

    $: doesAlreadyOwn = ownedBundles && !!ownedBundles.find(x => x.id === bundleInfo.id);

    let loadingBuy = false;
    async function createPaymentIntent() {
        if ($user === loading || $user === unavailable)
            return;

        loadingBuy = true;
        const userCosmeticsRes = await fetch($accountUrl + "/api/v2/accounts/checkout_bundle", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${$user.client_token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                bundle_id: bundleInfo.id
            })
        });
        loadingBuy = false;

        if (!userCosmeticsRes.ok) {
            return;
        }

        const json = await userCosmeticsRes.json();
        dispatchEvent("open-purchase-form", { bundle: bundleInfo, clientSecret: json.data.client_secret, checkoutSessionId: json.data.checkout_session_id });
    }

    function previewBundle() {
        dispatchEvent("preview-bundle", { bundle: bundleInfo });
    }
</script>

<div class="flex items-center gap-2 filter" class:grayscale={doesAlreadyOwn}>
    <FeaturedBundleThumbnail {bundleInfo} ownedItems={ownedBundles} size={96} showDetails={false}/>
    <div class="flex gap-1 flex-1 items-center">
        <div class="flex-1 flex flex-col">
            <span>{bundleInfo.name} Bundle</span>
            <span class="text-text-300 italic text-xs">Released on {boughtAtFormat.format(new Date(bundleInfo.added_at))}</span>
            <span class="text-text-300 italic text-xs">{bundleInfo.num_items} item{bundleInfo.num_items === 1 ? "" : "s"}</span>
        </div>
        <div class="flex-[2_0_0] flex flex-col">
            <span>Items</span>
            <PreviewItemSelection
                {bundleInfo}
                {playerColor}
                isOfficial={false}
                showGroups={false}
                selectedItemId={null}
                searchTerm={""}
                thumbScale={1}
                showMax={4}
                itemSize={58}/>
        </div>
        <div class="ml-auto flex-1 flex flex-col gap-1">
            <button
                class="rounded-lg text-xs bg-accent2 text-text-200 px-4 py-1 hover:bg-accent2/70 hover:text-text-300 filter border-none font-inherit text-inherit text-inherit cursor-pointer"
                class:grayscale={loadingBuy || $user === loading || $user === unavailable || doesAlreadyOwn}
                class:pointer-events-none={loadingBuy || $user === loading || $user === unavailable || doesAlreadyOwn}
                on:click={createPaymentIntent}
            >
                {#if doesAlreadyOwn}
                    You already own this bundle.
                {:else if $user !== loading && $user !== unavailable}
                    Purchase for ${(bundleInfo.price_usd / 100).toFixed(2)}
                {:else}
                    Login to purchase
                {/if}
            </button>
            <button
                class="rounded-lg text-xs border-2 border-accent2/80 text-text-200 px-4 py-1 transition-colors duration-100 hover:border-accent2/40 hover:text-text-300 filter font-inherit text-inherit text-inherit cursor-pointer"
                class:grayscale={loadingBuy || $user === loading || $user === unavailable || doesAlreadyOwn}
                class:pointer-events-none={loadingBuy || $user === loading || $user === unavailable || doesAlreadyOwn}
                on:click={previewBundle}
            >
                Preview
            </button>
        </div>
    </div>
</div>