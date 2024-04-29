using System.Linq;
using HarmonyLib;
using Il2CppSystem.Dynamic.Utils;
using UnityEngine;

namespace MouthwashClient.Patches.OnlinePlay
{
    [HarmonyPatch(typeof(PlayerCustomizationMenu), nameof(PlayerCustomizationMenu.Start))]
    public static class RemoveCosmicubeCustomizationPatch
    {
        public static void Postfix(PlayerCustomizationMenu __instance)
        {
            TabButton? cubesTab = null;
            foreach (TabButton button in __instance.Tabs)
            {
                if (button.Button.transform.parent.gameObject.name == "CubesTab")
                {
                    cubesTab = button;
                    Object.Destroy(button.Button.transform.parent.parent.gameObject);
                }
            }

            if (cubesTab != null)
            {
                __instance.Tabs = __instance.Tabs.Where(tab => tab != cubesTab).ToArray();
            }
        }
    }
}