using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using BepInEx.Configuration;
using HarmonyLib;
using Innersloth.Assets;
using Reactor.Utilities;
using UnityEngine;
using UnityEngine.Serialization;

namespace MouthwashClient.Patches.Dump
{
    [Serializable]
    public struct AssetInfoVec2
    {
        public float x;
        public float y;
    }

    public struct AssetFileReference
    {
        public string file;
        public AssetInfoVec2 pivot;
    }

    [Serializable]
    public struct AssetInfo
    {
        public string type;
        public AssetInfoVec2 chip_offset;
        public string product_id;
        public bool? in_front;
        public bool? use_player_color;
        public AssetFileReference? main;
        public AssetFileReference? back;
        public AssetFileReference? left_main;
        public AssetFileReference? left_back;
        public AssetFileReference? climb;
        public AssetFileReference? floor;
        public AssetFileReference? left_climb;
        public AssetFileReference? left_floor;
        public AssetFileReference? thumb;
    }

    [Serializable]
    public struct BundleMetadataInfo
    {
        public AssetInfo[] assets;
    }
    
    [HarmonyPatch(typeof(HatManager), nameof(HatManager.Initialize))]
    public static class DumpCosmetics
    {
        public static string BaseDestinationPath = "";
        public static string BaseOriginPath = "";

        public static int NumAllLoaded;
        public static List<AssetInfo> AllAssets = new();
        
        public static void Postfix(HatManager __instance)
        {
            ConfigEntry<bool> dumpsEnabledConfig = PluginSingleton<MouthwashClientPlugin>.Instance.Config.Bind(
                "Dumps.Cosmetics",
                "Enabled",
                false,
                "Whether or not to dump assets from the game");

            ConfigEntry<string> destinationPathConfig = PluginSingleton<MouthwashClientPlugin>.Instance.Config.Bind(
                "Dumps.Cosmetics",
                "DestinationPath",
                "",
                "The path to dump assets to");
            
            ConfigEntry<string> originPathConfig = PluginSingleton<MouthwashClientPlugin>.Instance.Config.Bind(
                "Dumps.Cosmetics",
                "OriginPath",
                "",
                "The path to read sprites from, exported with AssetStudio");
            
            if (!dumpsEnabledConfig.Value)
            {
                PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage("Dumps are disabled..");
                return;
            }

            BaseDestinationPath = destinationPathConfig.Value;
            BaseOriginPath = originPathConfig.Value;

            int numAllReceived = 0;
            NumAllLoaded = 0;
            AllAssets.Clear();
            foreach (HatData hatData in __instance.allHats)
            {
                if (!hatData.Free)
                    continue;
                Directory.CreateDirectory(Path.Combine(BaseDestinationPath, numAllReceived.ToString()));
                AddressableAsset<HatViewData> hatViewDataAddr = hatData.CreateAddressableAsset();
                __instance.StartCoroutine(CoLoadHatViewData(numAllReceived, hatData, hatViewDataAddr));
                numAllReceived++;
            }

            foreach (SkinData skinData in __instance.allSkins)
            {
                if (!skinData.Free)
                    continue;
                Directory.CreateDirectory(Path.Combine(BaseDestinationPath, numAllReceived.ToString()));
                AddressableAsset<SkinViewData> skinViewDataAdr = skinData.CreateAddressableAsset();
                __instance.StartCoroutine(CoLoadSkinViewData(numAllReceived, skinData, skinViewDataAdr));
                numAllReceived++;
            }

            foreach (VisorData visorData in __instance.allVisors)
            {
                if (!visorData.Free)
                    continue;
                Directory.CreateDirectory(Path.Combine(BaseDestinationPath, numAllReceived.ToString()));
                AddressableAsset<VisorViewData> visorViewDataAddr = visorData.CreateAddressableAsset();
                __instance.StartCoroutine(CoLoadVisorViewData(numAllReceived, visorData, visorViewDataAddr));
                numAllReceived++;
            }

            __instance.StartCoroutine(WaitForAllLoaded(numAllReceived));
        }

        public static IEnumerator WaitForAllLoaded(int numReceived)
        {
            while (numReceived != NumAllLoaded)
                yield return null;
            File.WriteAllBytes(Path.Combine(BaseDestinationPath, "metadata.json"), Utf8Json.JsonSerializer.Serialize(new BundleMetadataInfo
            {
                assets = AllAssets.ToArray()
            }));
        }

        public static IEnumerator CoLoadHatViewData(int hatId, HatData hatData, AddressableAsset<HatViewData> hatViewDataAddr)
        {
            yield return hatViewDataAddr.CoLoadAsync();
            HatViewData hatViewData = hatViewDataAddr.GetAsset();
            WritePngForSprite(hatId, "main.png", hatViewData.MainImage);
            WritePngForSprite(hatId, "back.png", hatViewData.BackImage);
            WritePngForSprite(hatId, "left_main.png", hatViewData.LeftMainImage);
            WritePngForSprite(hatId, "left_back.png", hatViewData.LeftBackImage);
            WritePngForSprite(hatId, "floor.png", hatViewData.FloorImage);
            WritePngForSprite(hatId, "climb.png", hatViewData.ClimbImage);
            WritePngForSprite(hatId, "left_floor.png", hatViewData.LeftFloorImage);
            WritePngForSprite(hatId, "left_climb.png", hatViewData.LeftClimbImage);
            WritePngForSprite(hatId, "thumb.png", hatViewData.MainImage);
            NumAllLoaded++;
            AllAssets.Add(new AssetInfo
            {
                type = "HAT",
                product_id = hatData.ProductId,
                use_player_color = hatViewData.MatchPlayerColor && hatViewData.MatchPlayerColor.ToString() == DestroyableSingleton<HatManager>.Instance.PlayerMaterial.name,
                in_front = hatData.InFront,
                chip_offset = new AssetInfoVec2{ x = hatData.ChipOffset.x, y = hatData.ChipOffset.y },
                main = hatViewData.MainImage == null ? null : new AssetFileReference{ file = "main.png", pivot = { x = hatViewData.MainImage.pivot.x, y = hatViewData.MainImage.pivot.y } },
                back = hatViewData.BackImage == null ? null : new AssetFileReference{ file = "back.png", pivot = { x = hatViewData.BackImage.pivot.x, y = hatViewData.BackImage.pivot.y } },
                left_main = hatViewData.LeftMainImage == null ? null : new AssetFileReference{ file = "left_main.png", pivot = { x = hatViewData.LeftMainImage.pivot.x, y = hatViewData.LeftMainImage.pivot.y } },
                left_back = hatViewData.LeftBackImage == null ? null : new AssetFileReference{ file = "left_back.png", pivot = { x = hatViewData.LeftBackImage.pivot.x, y = hatViewData.LeftBackImage.pivot.y } },
                floor = hatViewData.FloorImage == null ? null : new AssetFileReference{ file = "floor.png", pivot = { x = hatViewData.FloorImage.pivot.x, y = hatViewData.FloorImage.pivot.y } },
                climb = hatViewData.ClimbImage == null ? null : new AssetFileReference{ file = "climb.png", pivot = { x = hatViewData.ClimbImage.pivot.x, y = hatViewData.ClimbImage.pivot.y } },
                left_floor = hatViewData.LeftFloorImage == null ? null : new AssetFileReference{ file = "left_floor.png", pivot = { x = hatViewData.LeftFloorImage.pivot.x, y = hatViewData.LeftFloorImage.pivot.y } },
                left_climb = hatViewData.LeftClimbImage == null ? null : new AssetFileReference{ file = "left_climb.png", pivot = { x = hatViewData.LeftClimbImage.pivot.x, y = hatViewData.LeftClimbImage.pivot.y } },
                thumb = hatViewData.MainImage == null ? null : new AssetFileReference{ file = "thumb.png", pivot = { x = hatViewData.MainImage.pivot.x, y = hatViewData.MainImage.pivot.y } }
            });
        }

        public static IEnumerator CoLoadSkinViewData(int skinId, SkinData skinData, AddressableAsset<SkinViewData> skinViewDataAddr)
        {
            yield return skinViewDataAddr.CoLoadAsync();
            SkinViewData skinViewData = skinViewDataAddr.GetAsset();
            if (skinData.ProductId == "skin_None")
            {
            }
            else
            {
                WritePngForSpriteName(skinId, "main.png", skinData.ProductId.ToLower() + ".png");
                WritePngForSpriteName(skinId, "thumb.png", skinData.ProductId.ToLower() + ".png");
            }
            NumAllLoaded++;
            AllAssets.Add(new AssetInfo
            {
                type = "SKIN",
                product_id = skinData.ProductId,
                use_player_color = skinViewData.MatchPlayerColor,
                chip_offset = new AssetInfoVec2{ x = skinData.ChipOffset.x, y = skinData.ChipOffset.y },
                main = skinData.ProductId == "skin_None" || skinViewData.IdleFrame == null ? null : new AssetFileReference{ file = "main.png", pivot = { x = skinViewData.IdleFrame.pivot.x, y = skinViewData.IdleFrame.pivot.y } },
                thumb = skinData.ProductId == "skin_None" || skinViewData.IdleFrame == null ? null : new AssetFileReference{ file = "thumb.png", pivot = { x = skinViewData.IdleFrame.pivot.x, y = skinViewData.IdleFrame.pivot.y } }
            });
        }

        public static IEnumerator CoLoadVisorViewData(int visorId, VisorData visorData, AddressableAsset<VisorViewData> visorViewDataAddr)
        {
            yield return visorViewDataAddr.CoLoadAsync();
            VisorViewData visorViewData = visorViewDataAddr.GetAsset();
            WritePngForSprite(visorId, "main.png", visorViewData.IdleFrame);
            WritePngForSprite(visorId, "thumb.png", visorViewData.IdleFrame);
            NumAllLoaded++;
            AllAssets.Add(new AssetInfo
            {
                type = "VISOR",
                product_id = visorData.ProductId,
                use_player_color = false,
                chip_offset = new AssetInfoVec2{ x = visorData.ChipOffset.x, y = visorData.ChipOffset.y },
                main = visorViewData.IdleFrame == null ? null : new AssetFileReference{ file = "main.png", pivot = { x = visorViewData.IdleFrame.pivot.x, y = visorViewData.IdleFrame.pivot.y } },
                thumb = visorViewData.IdleFrame == null ? null : new AssetFileReference{ file = "main.png", pivot = { x = visorViewData.IdleFrame.pivot.x, y = visorViewData.IdleFrame.pivot.y } }
            });
        }

        public static void WritePngForSprite(int hatId, string spriteName, Sprite? sprite)
        {
            if (sprite == null)
                return;
            WritePngForSpriteName(hatId, spriteName, sprite.name + ".png");
        }

        public static void WritePngForSpriteName(int hatId, string spriteName, string spriteFileName)
        {
            if (File.Exists(Path.Combine(BaseDestinationPath, hatId.ToString(), spriteName)))
                File.Delete(Path.Combine(BaseDestinationPath, hatId.ToString(), spriteName));
            File.Copy(Path.Combine(BaseOriginPath, spriteFileName), Path.Combine(BaseDestinationPath, hatId.ToString(), spriteName));
        }
    }
}