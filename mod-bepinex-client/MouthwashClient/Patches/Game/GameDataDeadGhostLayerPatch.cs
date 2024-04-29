using HarmonyLib;
using UnityEngine;

namespace MouthwashClient.Patches.Game
{
    [HarmonyPatch(typeof(GameData.PlayerInfo), nameof(GameData.PlayerInfo.Deserialize))]
    public static class GameDataDeadGhostLayerPatch
    {
        public static void Postfix(GameData.PlayerInfo __instance)
        {
            // Adapted from PlayerControl.cs
            if (__instance.Object != null && ShipStatus.Instance != null)
            {
                __instance.Object.gameObject.layer =
                    __instance.IsDead ? LayerMask.NameToLayer("Ghost") : LayerMask.NameToLayer("Players");

                if (__instance.Object.AmOwner)
                {
                    DestroyableSingleton<HudManager>.Instance.Chat.SetVisible(__instance.IsDead);
                    DestroyableSingleton<HudManager>.Instance.ShadowQuad.gameObject.SetActive(!__instance.IsDead);
                    __instance.Object.AdjustLighting();
                }
            }
        }
    }
}