using AmongUs.Data;
using HarmonyLib;
using MouthwashClient.Services;
using UnityEngine.SceneManagement;

namespace MouthwashClient.Patches.Menu
{
    [HarmonyPatch(typeof(PlayerCustomizationMenu), nameof(PlayerCustomizationMenu.OnDisable))]
    public class SavePlayerCustomizationInMainMenuPatch
    {
        public static void Postfix(PlayerCustomizationMenu __instance)
        {
            if (SceneManager.GetActiveScene().name == "MainMenu")
            {
                DestroyableSingleton<AmongUsClient>.Instance.StartCoroutine(
                    CosmeticOwnershipService.CoSaveCosmetics(
                        DataManager.Player.customization.hat,
                        DataManager.Player.customization.pet,
                        DataManager.Player.customization.skin,
                        DataManager.Player.customization.colorID,
                        DataManager.Player.customization.visor,
                        DataManager.Player.customization.namePlate));
            }
        }
    }
}