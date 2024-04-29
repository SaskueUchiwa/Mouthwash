using System;
using System.Collections;
using System.Collections.Generic;
using System.Threading.Tasks;
using AmongUs.Data;
using HarmonyLib;
using MouthwashClient.Services;
using Reactor.Utilities;
using TMPro;
using UnityEngine.SceneManagement;

namespace MouthwashClient.Patches
{
    [HarmonyPatch(typeof(MainMenuManager), nameof(MainMenuManager.Start))]
    public static class LoadInformationPatch
    {
        private static bool _onceLogin = false;
        
        public static void Postfix(MainMenuManager __instance)
        {
            if (_onceLogin) return;
            
            LoginService.ErrorCallback += s =>
            {
                PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage($"Showing error: {s}");
                PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage(DestroyableSingleton<DisconnectPopup>.Instance.isActiveAndEnabled);
                DestroyableSingleton<DiscordManager>.Instance.discordPopup.Show($"<size=150%>{s}</size>");
                DestroyableSingleton<EOSManager>.Instance.HideCallbackWaitAnim();
            };
            CosmeticOwnershipService.DoneCallback += () =>
            {
                HashSet<int> LoadedAssetBundleResourceIds = new();
                foreach (OwnedBundleItem ownedItem in CosmeticOwnershipService.OwnedBundleItems)
                {
                    if (LoadedAssetBundleResourceIds.Contains(ownedItem.AssetBundleBaseResourceId))
                        continue;

                    DestroyableSingleton<AmongUsClient>.Instance.StartCoroutine(
                        RemoteResourceService.CoFetchResourceAtLocationAndVerify(ownedItem.AssetBundleBaseResourceId,
                            ownedItem.AssetBundleUrl,
                            Convert.FromHexString(ownedItem.AssetBundleHash), ResourceType.AssetBundle, false));
                    LoadedAssetBundleResourceIds.Add(ownedItem.AssetBundleBaseResourceId);
                }
            };
            LoginService.DoneCallback += () =>
            {
                DestroyableSingleton<EOSManager>.Instance.HideCallbackWaitAnim();
                Reactor.Patches.ReactorVersionShower.UpdateText();
                DataManager.Player.Account.LoginStatus = EOSManager.AccountLoginStatus.LoggedIn;
                DataManager.Player.customization.hat = LoginService.GetLoginInformation().CosmeticHat;
                DataManager.Player.customization.pet = LoginService.GetLoginInformation().CosmeticPet;
                DataManager.Player.customization.skin = LoginService.GetLoginInformation().CosmeticSkin;
                DataManager.Player.customization.colorID = (byte)LoginService.GetLoginInformation().CosmeticColor;
                DataManager.Player.customization.visor = LoginService.GetLoginInformation().CosmeticVisor;
                DataManager.Player.customization.namePlate = LoginService.GetLoginInformation().CosmeticNameplate;
                DestroyableSingleton<AmongUsClient>.Instance.StartCoroutine(CosmeticOwnershipService
                    .CoLoadOwnedCosmetics());
            };
            DestroyableSingleton<AmongUsClient>.Instance.StartCoroutine(LoginService.CoInitialize());
            _onceLogin = true;

            DestroyableSingleton<AmongUsClient>.Instance.StartCoroutine(LoadEmojis());
        }
        
        public static IEnumerator LoadEmojis()
        {
            Task loadEmbeddedResourcesTask = EmbedResourcesService.CoLoadEmbeddedResources();
            while (!loadEmbeddedResourcesTask.IsCompleted)
                yield return null;
            
            if (EmbedResourcesService.LoadedAssetBundle != null)
            {
                TMP_Settings.instance.m_defaultSpriteAsset = EmbedResourcesService.LoadedAssetBundle.LoadAsset("Assets/Mods/Emojis/Emotes.asset")
                    .Cast<TMP_SpriteAsset>();
                PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage("Successfully loaded emojis!");
            }
            else
            {
                PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogError("Could not load TextMeshPro emojis");
            }
        }
    }

    [HarmonyPatch(typeof(EOSManager), nameof(EOSManager.ProductUserId), MethodType.Getter)]
    public static class FalsifyEOSProductUserIdPatch
    {
        public static bool Prefix(EOSManager __instance, ref string __result)
        {
            __result = "";
            return false;
        }
    }

    [HarmonyPatch(typeof(AccountManager), nameof(AccountManager.CanPlayOnline))]
    public static class AllowOnlinePlayPatch
    {
        public static bool Prefix(AccountManager __instance, ref bool __result)
        {
            __result = true;
            return false;
        }
    }

    [HarmonyPatch(typeof(EOSManager), nameof(EOSManager.StartInitialLoginFlow))]
    public static class PreventEOSLoginPatch
    {
        public static bool Prefix(EOSManager __instance)
        {
            SceneManager.LoadScene("MainMenu");
            return false;
        }
    }

    [HarmonyPatch(typeof(EOSManager), nameof(EOSManager.LoginWithCorrectPlatform))]
    public static class PreventEOSLoginPlatformPatch
    {
        public static bool Prefix(EOSManager __instance)
        {
            return false;
        }
    }

    [HarmonyPatch(typeof(EOSManager), nameof(EOSManager.HasFinishedLoginFlow))]
    public static class AssumeEOSLoggedInPatch
    {
        public static bool Prefix(EOSManager __instance, ref bool __result)
        {
            __result = true;
            return false;
        }
    }

    [HarmonyPatch(typeof(EOSManager._WaitForLoginFlow_d__164), nameof(EOSManager._WaitForLoginFlow_d__164.MoveNext))]
    public static class PreventWaitEOSLoggedInPatch
    {
        public static bool Prefix(EOSManager._WaitForLoginFlow_d__164 __instance, ref bool __result)
        {
            __result = false;
            return false;
        }
    }
}