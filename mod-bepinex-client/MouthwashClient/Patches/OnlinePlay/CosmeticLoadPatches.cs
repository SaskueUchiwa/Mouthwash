using System;
using System.Text.RegularExpressions;
using HarmonyLib;
using MouthwashClient.Services;
using PowerTools;
using Reactor.Utilities;
using UnityEngine;

namespace MouthwashClient.Patches.OnlinePlay
{
    public static class CosmeticLoadPatches
    {
	    public static void PopulateFromHatViewData(HatParent hatParent, HatViewData asset)
		{
			SpriteAnimNodeSync spriteAnimNodeSync = hatParent.SpriteSyncNode ?? hatParent.GetComponent<SpriteAnimNodeSync>();
			if (spriteAnimNodeSync)
			{
				spriteAnimNodeSync.NodeId = (hatParent.Hat.NoBounce ? 1 : 0);
			}
			if (hatParent.Hat.InFront)
			{
				hatParent.BackLayer.enabled = false;
				hatParent.FrontLayer.enabled = true;
				hatParent.FrontLayer.sprite = asset.MainImage;
			}
			else if (asset.BackImage)
			{
				hatParent.BackLayer.enabled = true;
				hatParent.FrontLayer.enabled = true;
				hatParent.BackLayer.sprite = asset.BackImage;
				hatParent.FrontLayer.sprite = asset.MainImage;
			}
			else
			{
				hatParent.BackLayer.enabled = true;
				hatParent.FrontLayer.enabled = false;
				hatParent.FrontLayer.sprite = null;
				hatParent.BackLayer.sprite = asset.MainImage;
			}
			if (hatParent.options.Initialized && hatParent.HideHat())
			{
				hatParent.FrontLayer.enabled = false;
				hatParent.BackLayer.enabled = false;
			}
		}

	    public static void SetCustomColors(Renderer rend, Color frontColor, Color backColor, Color visorColor)
	    {
		    // Reconstructed from: PlayerMaterial.cs
		    rend.material.SetColor("_BackColor", backColor);
		    rend.material.SetColor("_BodyColor", frontColor);
		    rend.material.SetColor("_VisorColor", visorColor);
	    }
        
        public static void UpdateHatMaterial(HatParent hat, HatViewData hatViewData, bool setColors, Color frontColor, Color backColor, Color visorColor)
        {
            // Reconstructed from: HatParent.cs
            if (hatViewData && hatViewData.MatchPlayerColor)
            {
                hat.FrontLayer.sharedMaterial =   DestroyableSingleton<HatManager>.Instance.MaskedPlayerMaterial;
			
                if (hat.BackLayer)
                {
                    hat.BackLayer.sharedMaterial =  DestroyableSingleton<HatManager>.Instance.MaskedPlayerMaterial;
			
                }
            }
            else
            {
                hat.FrontLayer.sharedMaterial = DestroyableSingleton<HatManager>.Instance.DefaultShader;
                if (hat.BackLayer)
                {
                    hat.BackLayer.sharedMaterial = DestroyableSingleton<HatManager>.Instance.DefaultShader;
                }
            }

            if (setColors)
            {
	            SetCustomColors(hat.FrontLayer, frontColor, backColor, visorColor);
	            if (hat.BackLayer)
	            {
		            SetCustomColors(hat.BackLayer, frontColor, backColor, visorColor);
	            }
            }
            hat.FrontLayer.material.SetInt(PlayerMaterial.MaskLayer, hat.matProperties.MaskLayer);
            if (hat.BackLayer)
            {
	            hat.BackLayer.material.SetInt(PlayerMaterial.MaskLayer, hat.matProperties.MaskLayer);
            }
            PlayerMaterial.MaskType maskType = hat.matProperties.MaskType;
            if (maskType == PlayerMaterial.MaskType.ScrollingUI)
            {
                if (hat.FrontLayer)
                {
                    hat.FrontLayer.maskInteraction = SpriteMaskInteraction.VisibleInsideMask;
                }
                if (hat.BackLayer)
                {
                    hat.BackLayer.maskInteraction = SpriteMaskInteraction.VisibleInsideMask;
                }
            }
            else if (maskType == PlayerMaterial.MaskType.Exile)
            {
                if (hat.FrontLayer)
                {
                    hat.FrontLayer.maskInteraction = SpriteMaskInteraction.VisibleOutsideMask;
                }
                if (hat.BackLayer)
                {
                    hat.BackLayer.maskInteraction = SpriteMaskInteraction.VisibleOutsideMask;
                }
            }
            else
            {
                if (hat.FrontLayer)
                {
                    hat.FrontLayer.maskInteraction = SpriteMaskInteraction.None;
                }
                if (hat.BackLayer)
                {
                    hat.BackLayer.maskInteraction = SpriteMaskInteraction.None;
                }
            }
        }
        
        [HarmonyPatch(typeof(HatParent), nameof(HatParent.SetHat), typeof(int))]
        public static class CosmeticSetHatNormalPatch
        {
            public static bool Prefix(HatParent __instance, [HarmonyArgument(0)] int color)
            {
                if (RemoteResourceService.MockViewDataAddressable.TryGetValue(__instance.Hat.ProductId,
                        out ScriptableObject? viewData))
                {
	                if (viewData == null)
		                return true;
	                
                    HatViewData? hatViewData = viewData.TryCast<HatViewData>();
                    if (hatViewData == null)
                    {
                        PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogWarning(
                            $"Tried to load {__instance.Hat.name} as a hat");
                        return true;
                    }

                    __instance.UnloadAsset();
                    __instance.viewAsset = null;	
                    PopulateFromHatViewData(__instance, hatViewData);
                    if (color >= 0 && color < Palette.PlayerColors.Length)
                    {
	                    UpdateHatMaterial(__instance, hatViewData, true, Palette.PlayerColors[color],
		                    Palette.ShadowColors[color], Palette.VisorColor);
                    }
                    else
                    {
	                    UpdateHatMaterial(__instance, hatViewData, false, Color.white, Color.white, Color.white);
                    }

                    return false;
                }

                return true;
            }
        }
        
        [HarmonyPatch(typeof(HatParent), nameof(HatParent.SetIdleAnim))]
        public static class CosmeticSetHatIdleAnimationPatch
        {
	        public static bool Prefix(HatParent __instance, [HarmonyArgument(0)] int colorId)
	        {
		        if (__instance.Hat == null)
			        return false;
		        
		        if (RemoteResourceService.MockViewDataAddressable.TryGetValue(__instance.Hat.ProductId,
			            out ScriptableObject viewData))
		        {
			        if (viewData == null)
				        return true;
	                
			        HatViewData? hatViewData = viewData.TryCast<HatViewData>();
			        if (hatViewData == null)
			        {
				        PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogWarning(
					        $"Tried to load {__instance.Hat.name} as a hat");
				        return true;
			        }

			        __instance.UnloadAsset();
			        __instance.viewAsset = null;
			        PopulateFromHatViewData(__instance, hatViewData);
			        if (colorId >= 0 && colorId < Palette.PlayerColors.Length)
			        {
				        UpdateHatMaterial(__instance, hatViewData, true, Palette.PlayerColors[colorId],
					        Palette.ShadowColors[colorId], Palette.VisorColor);
			        }
			        else
			        {
				        UpdateHatMaterial(__instance, hatViewData, false, Color.white, Color.white, Color.white);
			        }
			        return false;
		        }

		        return true;
	        }
        }

        [HarmonyPatch(typeof(CosmeticsCache._CoAddHat_d__12), nameof(CosmeticsCache._CoAddHat_d__12.MoveNext))]
        public static class CosmeticsCacheAddHatPatch
        {
	        public static bool Prefix(CosmeticsCache._CoAddHat_d__12 __instance, ref bool __result)
	        {
		        if (RemoteResourceService.LoadedCosmetics.TryGetValue(__instance.id, out CosmeticData? cosmeticData))
		        {
			        if (cosmeticData == null)
				        return true;
			        
			        // don't load the addressable, we'll handle any references to cached hats ourselves below.
			        __result = false; // don't move next in the enumerator anymore
			        return false;
		        }

		        return true;
	        }
        }

        [HarmonyPatch(typeof(CosmeticsCache), nameof(CosmeticsCache.GetHat))]
        public static class CosmeticsCacheGetCachedHatPatch
        {
	        public static bool Prefix(CosmeticsCache __instance, ref HatViewData __result, [HarmonyArgument(0)] string id)
	        {
		        if (RemoteResourceService.LoadedCosmetics.TryGetValue(id, out CosmeticData? cosmeticData))
		        {
			        if (cosmeticData == null)
				        return true;

			        if (RemoteResourceService.MockViewDataAddressable.TryGetValue(cosmeticData.ProductId, out ScriptableObject? viewData))
			        {
				        if (viewData == null)
					        return true;
				        
				        HatViewData? hatViewData = viewData.TryCast<HatViewData>();
				        if (hatViewData == null)
				        {
					        PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogWarning(
						        $"Tried to load {cosmeticData.name} as a hat");
					        return true;
				        }

				        __result = hatViewData;
				        return false;
			        }
		        }

		        return true;
	        }
        }

        [HarmonyPatch(typeof(CosmeticData), nameof(CosmeticData.GetItemName))]
        public static class ResolveMouthwashItemName
        {
	        public static bool Prefix(CosmeticData __instance, ref string __result)
	        {
		        if (RemoteResourceService.LoadedCosmetics.TryGetValue(__instance.ProductId, out CosmeticData? cosmeticData))
		        {
			        if (cosmeticData == null)
				        return true;

			        string withoutTag = cosmeticData.ProductId.Replace("mwgg_", "");
			        string sentenceCase = Regex.Replace(withoutTag, "(?!^)[A-Z]", m => " " + m.Value);

			        __result = sentenceCase;
			        return false;
		        }

		        return true;
	        }
        }
    }
}