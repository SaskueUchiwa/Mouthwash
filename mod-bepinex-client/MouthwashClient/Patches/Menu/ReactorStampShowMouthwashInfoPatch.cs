using HarmonyLib;
using MouthwashClient.Services;
using Reactor.Utilities;
using UnityEngine;
using System;
using System.Collections;

namespace MouthwashClient.Patches.Menu
{
    [HarmonyPatch(typeof(Reactor.Patches.ReactorVersionShower), nameof(Reactor.Patches.ReactorVersionShower.UpdateText))]
    public static class ReactorStampShowMouthwashInfoPatch
    {
        public static void Postfix()
        {
            if (Reactor.Patches.ReactorVersionShower.Text != null)
            {
                Reactor.Patches.ReactorVersionShower.Text.text += $"\n<color=#8221cc>Polus.gg: Rewritten by edqx Support 2024.3.5 by\nGameTechGuides</color> {MouthwashClientPlugin.VersionString}";
                if (LoginService.IsLoggedIn())
                {
                    UserInformationWithAuthToken userInformation = LoginService.GetLoginInformation();
                    Reactor.Patches.ReactorVersionShower.Text.text += $"\nLogged in as {userInformation.DisplayName}\n Email Verified : {userInformation.EmailVerified}";
                }
                else if (!string.IsNullOrEmpty(LoginService.ErrorWhileLoggingIn))
                {
                    Reactor.Patches.ReactorVersionShower.Text.text += $"\n<color=#c92d22>{LoginService.ErrorWhileLoggingIn}</color>";
                }
                else
                {
                    Reactor.Patches.ReactorVersionShower.Text.text += "\n<color=#c92d22>Not logged in</color>";
                    Coroutines.Start(CoQuitGame());
                }
            }
        }

        private static IEnumerator CoQuitGame()
        {
            var timer = 5f;
            while (timer > 0f)
            {
                timer -= Time.deltaTime;
                DestroyableSingleton<DiscordManager>.Instance.discordPopup.Show($"Application Quiting In {timer}\n Next Time Dont forgot to launch with launcher");
                yield return new WaitForEndOfFrame();
            }
            Application.Quit();
        }
    }
}