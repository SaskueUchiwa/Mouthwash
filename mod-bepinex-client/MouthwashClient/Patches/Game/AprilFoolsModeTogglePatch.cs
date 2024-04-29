using HarmonyLib;

namespace MouthwashClient.Patches.Game;

[HarmonyPatch(typeof(AprilFoolsMode), nameof(AprilFoolsMode.ShouldShowAprilFoolsToggle))]
 public static class ShouldShowAprilFoolsToggle
 {
    public static void Postfix(ref bool __result)
    {
      __result = true;
    }
}