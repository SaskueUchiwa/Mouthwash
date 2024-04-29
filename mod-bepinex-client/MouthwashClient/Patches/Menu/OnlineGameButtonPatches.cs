using System.Collections;
using System.Linq;
using HarmonyLib;
using Il2CppSystem.Collections.Generic;
using MouthwashClient.Services;
using Reactor.Utilities;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

namespace MouthwashClient.Patches.Menu
{
    [HarmonyPatch(typeof(MainMenuManager), nameof(MainMenuManager.Start))]
    public static class SkipToOnlinePlayPatch
    {
        public static void Postfix(MainMenuManager __instance)
        {
            __instance.playButton.OnClick = __instance.PlayOnlineButton.OnClick;
        }
    }

    [HarmonyPatch(typeof(CreateGameOptions), nameof(CreateGameOptions.Show))]
    public static class SkipToStartGamePatch
    {
        public static bool Prefix(CreateGameOptions __instance)
        {
            if (!LoginService.IsLoggedIn())
            {
                DestroyableSingleton<DiscordManager>.Instance.discordPopup.Show($"<size=150%>You are not logged in, make\nsure you launch the game through\nthe launcher.</size>");
                PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage("User Try to create game without being logged in ! .");
                return false;
            }
            
            DestroyableSingleton<AmongUsClient>.Instance.StartCoroutine(CoStartGamePatch(__instance));
            return false;
        }

        public static IEnumerator CoStartGamePatch(CreateGameOptions __instance)
        {
            // we don't save create game data here, like the main game does
            SoundManager.Instance.CrossFadeSound("MainBG", null, 0.5f, 1.5f);
            __instance.Foreground.gameObject.SetActive(true);
            yield return Effects.ColorFade(__instance.Foreground, Color.clear, Color.black, 0.2f);
            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage("Creating game..");
            yield return AmongUsClient.Instance.CoCreateOnlineGame();
        }
    }

    [HarmonyPatch(typeof(FindGameButton), nameof(FindGameButton.OnClick))]
    public static class PreventNonLoggedInFindGamePatch
    {
        public static bool Prefix(FindGameButton __instance)
        {
            if (!LoginService.IsLoggedIn())
            {
                DestroyableSingleton<DiscordManager>.Instance.discordPopup.Show($"<size=150%>You are not logged in, make\nsure you launch the game through\nthe launcher.</size>");
                return false;
            }

            return true;
        }
    }
    
    [HarmonyPatch(typeof(TransitionOpen), nameof(TransitionOpen.OnEnable))]
    public static class PreventNonLoggedInJoinGamePatch
    {
        public static bool Prefix(TransitionOpen __instance)
        {
            if (__instance.gameObject.name == "JoinGameMenu")
            {
                if (!LoginService.IsLoggedIn())
                {
                    __instance.gameObject.SetActive(false);
                    DestroyableSingleton<DiscordManager>.Instance.discordPopup.Show($"<size=150%>You are not logged in, make\nsure you launch the game through\nthe launcher.</size>");
                    return false;
                }
            }

            return true;
        }
    }
}