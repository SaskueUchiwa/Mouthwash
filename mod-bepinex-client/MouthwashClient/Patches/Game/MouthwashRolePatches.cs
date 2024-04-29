using AmongUs.GameOptions;
using HarmonyLib;
using Hazel;
using InnerNet;
using MouthwashClient.Enums;
using MouthwashClient.Net;
using Reactor.Utilities;
using Reactor.Utilities.Extensions;
using UnityEngine;

namespace MouthwashClient.Patches.Game
{
    public static class MouthwashRolePatches
    {
        public static RoleBehaviour? MouthwashBasicRole;
        
        [HarmonyPatch(typeof(RoleManager), nameof(RoleManager.SetRole))]
        public static class OnlyMouthwashRolePatch
        {
            public static bool Prefix(RoleManager __instance, ref RoleTypes roleType)
            {
                if (MouthwashBasicRole == null)
                {
                    GameObject roleContainerObject = new GameObject();
                    roleContainerObject.name = "Basic Mouthwash Role";
                    MouthwashBasicRole = roleContainerObject.AddComponent<MouthwashRole>();
                }
                roleType = RoleTypes.Crewmate;
                __instance.AllRoles = new[] { MouthwashBasicRole };
                return true;
            }
        }

        [HarmonyPatch(typeof(InnerNetClient), nameof(InnerNetClient.HandleMessage))]
        public static class MouthwashSetRoleTeamHandleMessagePatch
        {
            public static bool Prefix(InnerNetClient __instance,
                [HarmonyArgument(0)] MessageReader reader, [HarmonyArgument(1)] SendOption sendOption)
            {
                switch (reader.Tag)
                {
                    case (byte)MouthwashRootPacketTag.SetRoleTeam:
                        if (PlayerControl.LocalPlayer == null)
                        {
                            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogWarning($"Got 'SetRoleTeam', but there was no local player");
                            return false;
                        }
                        if (PlayerControl.LocalPlayer.Data == null)
                        {
                            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogWarning($"Got 'SetRoleTeam', but the local player had no data");
                            return false;
                        }
                        if (PlayerControl.LocalPlayer.Data.Role == null)
                        {
                            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogWarning($"Got 'SetRoleTeam', but the local player had no role");
                            return false;
                        }
                        MouthwashRole? mouthwashRole = PlayerControl.LocalPlayer.Data.Role.TryCast<MouthwashRole>();
                        if (mouthwashRole == null)
                        {
                            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogWarning($"Could not cast {mouthwashRole} to MouthwashRole");
                            return false;
                        }

                        if (MouthwashBasicRole == null)
                        {
                            GameObject roleContainerObject = new GameObject();
                            roleContainerObject.name = "Basic Mouthwash Role";
                            MouthwashBasicRole = roleContainerObject.AddComponent<MouthwashRole>();
                        }
                        if (MouthwashBasicRole != null)
                        {
                            MouthwashBasicRole.TeamType = (RoleTeamTypes)reader.ReadByte();
                            MouthwashBasicRole.CanVent = MouthwashBasicRole.TeamType == RoleTeamTypes.Impostor;
                            mouthwashRole.TeamType = MouthwashBasicRole.TeamType;
                            mouthwashRole.CanVent = MouthwashBasicRole.CanVent;
                        }
                        PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage($"Your team type: {mouthwashRole.TeamType}");
                        
                        /*DestroyableSingleton<HudManager>.Instance.SetHudActive(
                            !DestroyableSingleton<ExileController>.InstanceExists
                            && Object.FindObjectOfType<MapBehaviour>() == null
                            && MeetingHud.Instance == null);*/
                        return false;
                }
                return true;
            }
        }

        [HarmonyPatch(typeof(RoleManager), nameof(RoleManager.AssignRoleOnDeath))]
        public static class RemoveGhostRolePatch
        {
            public static bool Prefix(RoleManager __instance)
            {
                return false;
            }
        }
    }
}