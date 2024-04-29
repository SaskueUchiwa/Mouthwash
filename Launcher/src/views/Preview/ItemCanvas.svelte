<script lang="ts">
    import { onMount } from "svelte";
    import * as audata from "@skeldjs/data";
    import * as amongus from "@skeldjs/constant";
    import type { LoadedCosmeticImage } from "../../lib/previewTypes";

    export let layers: (LoadedCosmeticImage|undefined)[];
    export let playerColor: amongus.Color;
    export let offset: { x: number; y: number; };

    let layerCanvases: (HTMLCanvasElement|undefined)[] = [];
    let materialApplicationCanvasElement: HTMLCanvasElement|undefined = undefined;

    for (const layer of layers) {
        if (layer && layer.img) {
            layer.img.onload = doRedraw;
        }
    }

    function step(a: number, x: number) {
        return x >= a ? 1 : 0;
    }

    type RGB = [ number, number, number ];
    function saturate(x: RGB): RGB {
        return [ saturatef(x[0]), saturatef(x[1]), saturatef(x[2]) ];
    }

    function saturatef(x: number) {
        return x < 0 ? 0 : x > 1 ? 1 : x;
    }

    function scale(t: RGB, x: number): RGB {
        return [ t[0] * x, t[1] * x, t[2] * x ];
    }

    function add(a: RGB, b: RGB): RGB {
        return [ a[0] + b[0], a[1] + b[1], a[2] + b[2] ];
    }

    function normaliseColor(a: RGB): RGB {
        return [ a[0] / 255, a[1] / 255, a[2] / 255 ];
    }

    function applyPlayerMaterial(img: HTMLImageElement, actualWidth: number, actualHeight: number) {
        if (materialApplicationCanvasElement === undefined)
            return;

        const materialApplicationCtx = materialApplicationCanvasElement.getContext("2d", { willReadFrequently: true });

        materialApplicationCanvasElement.width = actualWidth;
        materialApplicationCanvasElement.height = actualHeight;
        materialApplicationCtx.clearRect(0, 0, materialApplicationCanvasElement.width, materialApplicationCanvasElement.height);
        materialApplicationCtx.drawImage(img, 0, 0, actualWidth, actualHeight);

        // Adapted from https://github.com/edqx/MouthwashUnity/blob/master/Assets/Mods/BundleCosmetics/BlendPlayerShader.shader
        const colorCodes = audata.ColorCodes[playerColor] || audata.ColorCodes[amongus.Color.Red];
        const _Tolerance = 9000;
        const _BodyColor = normaliseColor(colorCodes.highlightRGB as RGB);
        const _BackColor = normaliseColor(colorCodes.shadowRGB as RGB);
        const _VisorColor = normaliseColor([ 149, 202, 220 ] as RGB);
        const canvasData = materialApplicationCtx.getImageData(0, 0, img.width, img.height);
        for (let i = 0; i < canvasData.data.length; i += 4) {
            const r = canvasData.data[i] / 255;
            const g = canvasData.data[i + 1] / 255;
            const b = canvasData.data[i + 2] / 255;
            
            const testr = step(g, _Tolerance / 255) * step(b, _Tolerance / 255);
            const testg = step(r, _Tolerance / 255) * step(b, _Tolerance / 255);
            const testb = step(r, _Tolerance / 255) * step(g, _Tolerance / 255);
            const test = testr + testg + testb;
            
            const mx = Math.max(r, Math.max(g, b));
			const mn = Math.min(r, Math.min(g, b));

            const col = saturate(
                    add(
                        scale(
                            scale(_BodyColor, r),
                            testr
                        ),
                        add(
                            scale(
                                scale(_VisorColor, g),
                                testg
                            ),
                            add(
                                scale(
                                    scale(_BackColor, b),
                                    testb
                                ),
                                scale(
                                    [ r, g, b ],
                                    1 - saturatef(test)
                                )
                            )
                        )
                    )
                );
            if (mx < 0.001 ||
                Math.abs(1 - mn / mx) < .45)
            {
                col[0] = r;
                col[1] = g;
                col[2] = b;
            }

            canvasData.data[i] = col[0] * 255;
            canvasData.data[i + 1] = col[1] * 255;
            canvasData.data[i + 2] = col[2] * 255;
            // we leave alpha the same
        }
        return canvasData;
    }

    function doRedraw() {
        for (let i = 0; i < layers.length; i++) {
            const canvasElement = layerCanvases[i];
            if (!canvasElement) continue;
            const canvasCtx = canvasElement.getContext("2d");
            const canvasBounds = canvasElement.getBoundingClientRect();
            canvasElement.width = canvasBounds.width;
            canvasElement.height = canvasBounds.height;
            canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            const layer = layers[i];
            if (layer && layer.img && layer.img.complete) {
                const aspectRatio = layer.img.width / layer.img.height;
                const actualWidth = canvasElement.width * layer.scale;
                const actualHeight = actualWidth / aspectRatio;
                const centreX = canvasElement.width / 2;
                const centreY = canvasElement.height / 2;

                if (layer.material === "player") {
                    const imageData = applyPlayerMaterial(layer.img, actualWidth, actualHeight);
                    if (!imageData) continue;

                    canvasCtx.putImageData(imageData, centreX - actualWidth / 2 + offset.x, centreY - actualHeight / 2 + offset.y);
                } else {
                    canvasCtx.drawImage(layer.img, centreX - actualWidth / 2 + offset.x, centreY - actualHeight / 2 + offset.y, actualWidth, actualHeight);
                }
            }
        }
    }

    onMount(() => {
        doRedraw();
    });

    $: playerColor, doRedraw();
</script>

<canvas class="hidden" width={0} height={0} bind:this={materialApplicationCanvasElement}></canvas>
<div class="relative w-full h-full">
    {#each layers as _, i}
        <canvas width={0} height={0} class="absolute left-0 top-0 w-full h-full" bind:this={layerCanvases[i]} on:load={doRedraw}></canvas>
    {/each}
</div>