using HarmonyLib;
using Reactor.Utilities;
using UnityEngine;

namespace MouthwashClient.Patches.Menu
{
    [HarmonyPatch(typeof(MainMenuManager), nameof(MainMenuManager.Awake))]
    public static class RemoveMyAccountButtonPatch
    {
        public static void Postfix(MainMenuManager __instance)
        {
            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogInfo("Removing my Vanilla account button..");
            if (__instance.myAccountButton.gameObject != null)
            {
                __instance.mainButtons.Remove(__instance.myAccountButton);
                __instance.myAccountButton.transform.position = new Vector3(99999f, 99999f, 0f);
            }
        }
    }
}
