using System.Collections.Generic;
using System.Linq;
using HarmonyLib;
using Hazel;
using MouthwashClient.Enums;

namespace MouthwashClient.Patches.Game
{
    public static class SetPlayerVisionModifierPatches
    {
        public static float VisionModifier = 1f;
        
        [HarmonyPatch(typeof(LobbyBehaviour), nameof(LobbyBehaviour.Start))]
        public static class ResetPlayerVisionPatch
        {
            public static void Postfix(LobbyBehaviour __instance)
            {
                VisionModifier = 1f;
            }
        }
    
        [HarmonyPatch(typeof(PlayerControl), nameof(PlayerControl.HandleRpc))]
        public class HandleSetPlayerVisionModifierRpcPatch
        {
            public static bool Prefix(PlayerControl __instance, [HarmonyArgument(0)] byte callId,
                [HarmonyArgument(1)] MessageReader reader)
            {
                switch (callId)
                {
                    case (byte)MouthwashRpcPacketTag.SetPlayerVisionModifier:
                        if (__instance == PlayerControl.LocalPlayer)
                        {
                            VisionModifier = reader.ReadSingle();
                        }
                        return false;
                }
                return true;
            }
        }

        [HarmonyPatch(typeof(ShipStatus), nameof(ShipStatus.CalculateLightRadius))]
        public class ManagePlayerVisionPatch
        {
            public static void Postfix(ShipStatus __instance, ref float __result)
            {
                __result *= VisionModifier;
            }
        }
    }
}