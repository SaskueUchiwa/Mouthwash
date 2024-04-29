using System.Collections;
using AmongUs.Data;
using AmongUs.Data.Player;
using AmongUs.GameOptions;
using HarmonyLib;
using InnerNet;
using Reactor.Utilities;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace MouthwashClient.Patches.OnlinePlay
{
    public static class DisableCustomizationSavePatches
    {
        public static void ResetPlayerCustomizationForSession()
        {
            DataManager.Player.customization.hat = "hat_NoHat";
            DataManager.Player.customization.skin = "skin_None";
            DataManager.Player.customization.pet = "pet_EmptyPet";
            DataManager.Player.customization.visor = "visor_EmptyVisor";
            DataManager.Player.customization.namePlate = "nameplate_NoPlate";
        }
        
        [HarmonyPatch(typeof(AbstractUserSaveData), nameof(AbstractUserSaveData.HandleLoad))]
        public static class DisableHatCustomizationLoadPatch
        {
            public static void Postfix(AbstractUserSaveData __instance)
            {
                ResetPlayerCustomizationForSession();
            }
        }
        
        [HarmonyPatch(typeof(AbstractUserSaveData), nameof(AbstractUserSaveData.HandleSave))]
        public static class DisableHatCustomizationSavePatch
        {
            public static bool Prefix(AbstractUserSaveData __instance)
            {
                return false;
            }
        }

        [HarmonyPatch(typeof(PlayerControl._Start_d__105), nameof(PlayerControl._Start_d__105.MoveNext))]
        public static class DisablePlayerControlLoadInitialCosmeticsPatch
        {
            public static bool Prefix(PlayerControl._Start_d__105 __instance, ref bool __result)
            {
                __result = false;
                __instance.__4__this.StartCoroutine(PlayerControlStart(__instance.__4__this));
                return false;
            }
        }

        public static IEnumerator PlayerControlStart(PlayerControl __instance)
        {
            while (__instance.PlayerId == 255)
            {
                yield return null;
            }
            while (GameManager.Instance == null || GameData.Instance == null)
            {
                yield return null;
            }
            __instance.RemainingEmergencies = GameManager.Instance.LogicOptions.GetNumEmergencyMeetings();
            __instance.SetColorBlindTag();
            __instance.cosmetics.UpdateVisibility();
            if (__instance.AmOwner)
            {
                __instance.lightSource = Object.Instantiate<LightSource>(__instance.LightPrefab, __instance.transform, false);
                __instance.lightSource.Initialize(__instance.Collider.offset * 0.5f);
                PlayerControl.LocalPlayer = __instance;
                if (Camera.main != null) Camera.main.GetComponent<FollowerCamera>().SetTarget(__instance);
                __instance.SetName(DataManager.Player.Customization.Name, false);
                __instance.SetColor(DataManager.Player.Customization.Color);
                if (Application.targetFrameRate > 30)
                {
                    __instance.MyPhysics.EnableInterpolation();
                }
                __instance.CmdCheckName(DataManager.Player.Customization.Name);
                __instance.RpcSetLevel(DataManager.Player.Stats.Level);
                yield return null;
            }
            else
            {
                __instance.StartCoroutine(__instance.ClientInitialize());
            }
            __instance.MyPhysics.SetBodyType(__instance.BodyType);
            if (__instance.isNew)
            {
                __instance.isNew = false;
                __instance.StartCoroutine(__instance.MyPhysics.CoSpawnPlayer(LobbyBehaviour.Instance));
            }
            if (PlayerControl.LocalPlayer == __instance)
            {
                __instance.clickKillCollider.enabled = false;
            }
        }
    }
}