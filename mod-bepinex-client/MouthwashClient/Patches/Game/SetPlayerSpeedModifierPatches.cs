using System.Collections.Generic;
using System.Linq;
using HarmonyLib;
using Hazel;
using MouthwashClient.Enums;
using Reactor.Utilities;

namespace MouthwashClient.Patches.Game
{
    public static class SetPlayerSpeedModifierPatches
    {
        public static Dictionary<byte, float> SpeedModifierPlayers = new();
        
        [HarmonyPatch(typeof(LobbyBehaviour), nameof(LobbyBehaviour.Start))]
        public static class ResetPlayerSpeedPatch
        {
            public static void Postfix(LobbyBehaviour __instance)
            {
                SpeedModifierPlayers.Clear();
            }
        }
    
        [HarmonyPatch(typeof(PlayerControl), nameof(PlayerControl.HandleRpc))]
        public class HandleSetPlayerSpeedModifierRpcPatch
        {
            public static bool Prefix(PlayerControl __instance, [HarmonyArgument(0)] byte callId,
                [HarmonyArgument(1)] MessageReader reader)
            {
                switch (callId)
                {
                    case (byte)MouthwashRpcPacketTag.SetPlayerSpeedModifier:
                        SpeedModifierPlayers[__instance.PlayerId] = reader.ReadSingle();
                        return false;
                }
                return true;
            }
        }

        [HarmonyPatch(typeof(LogicOptions), nameof(LogicOptions.GetPlayerSpeedMod))]
        public class ManagePlayerSpeedPatch
        {
            public static void Postfix(LogicOptions __instance, ref float __result, [HarmonyArgument(0)] PlayerControl playerControl)
            {
                __result *= SpeedModifierPlayers.TryGetValue(playerControl.PlayerId, out float speedModifier)
                    ? speedModifier
                    : 1f;
            }
        }
    }
}