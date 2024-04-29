using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using AmongUs.GameOptions;
using HarmonyLib;
using Hazel;
using InnerNet;
using MouthwashClient.Enums;
using MouthwashClient.Patches.Lobby;
using Reactor.Utilities;
using UnityEngine;
using Object = UnityEngine.Object;

namespace MouthwashClient.Patches.Game
{
    public struct GameStartGameScreen
    {
        public string TitleText;
        public string SubtitleText;
        public Color BackgroundColor;
        public byte[] YourTeam;
    }
    
    public static class CustomGameIntroPatches
    {
        public static bool HasReceivedIntroInformation;

        public static GameStartGameScreen IntroInformation = new()
        {
            TitleText = "",
            SubtitleText = "",
            BackgroundColor = Color.white,
            YourTeam = { }
        };

        [HarmonyPatch(typeof(PlayerControl), nameof(PlayerControl.Awake))]
        public static class ResetCustomIntroPatch
        {
            public static void Postfix(PlayerControl __instance)
            {
                if (__instance == PlayerControl.LocalPlayer)
                {
                    PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage("Resetting start game screen..");
                    HasReceivedIntroInformation = false;
                }
            }
        }

        private static IEnumerator? _showIntroCoroutine;
        
        [HarmonyPatch(typeof(HudManager._CoShowIntro_d__87), nameof(HudManager._CoShowIntro_d__87.MoveNext))]
        public static class CustomIntroCheckPatch
        {
            public static bool Prefix(HudManager._CoShowIntro_d__87 __instance, ref bool __result)
            {
                __result = false;
                if (!HasReceivedIntroInformation) // don't show intro if we haven't received intro information yet
                    return false;

                PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage("Showing custom intro..");
                if (_showIntroCoroutine != null) __instance.__4__this.StopCoroutine(_showIntroCoroutine);
                _showIntroCoroutine = __instance.__4__this.StartCoroutine(CustomCoShowIntro(__instance.__4__this));
                return false;
            }
        }

        public static void PlayerControlStartIntro()
        {
            foreach (PlayerControl pc in PlayerControl.AllPlayerControls)
            {
                if (!pc.roleAssigned)
                    return;
            }

            foreach (PlayerControl pc in PlayerControl.AllPlayerControls)
            {
                PlayerNameColor.Set(pc);
            }

            DestroyableSingleton<HudManager>.Instance.StartCoroutine(DestroyableSingleton<HudManager>.Instance.CoShowIntro());
            DestroyableSingleton<HudManager>.Instance.HideGameLoader();
        }

        [HarmonyPatch(typeof(InnerNetClient), nameof(InnerNetClient.HandleMessage))]
        public static class CustomIntroMessageHandlePatch
        {
            public static bool Prefix(InnerNetClient __instance,
                [HarmonyArgument(0)] MessageReader reader, [HarmonyArgument(1)] SendOption sendOption)
            {
                switch (reader.Tag)
                {
                    case (int)MouthwashRootPacketTag.Intro:
                    {
                        string titleText = reader.ReadString();
                        string subtitleText = reader.ReadString();
                        Color backgroundColor = MouthwashChatMessageAppearance.ReadColor(reader);
                        byte[] yourTeam = reader.ReadBytes(reader.BytesRemaining);
                        
                        PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage($"Got start game screen: {titleText}: {subtitleText} ({backgroundColor}, team={yourTeam})");

                        IntroInformation = new GameStartGameScreen()
                        {
                            TitleText = titleText,
                            SubtitleText = subtitleText,
                            BackgroundColor = backgroundColor,
                            YourTeam = yourTeam
                        };
                        HasReceivedIntroInformation = true;
                        PlayerControlStartIntro();
                        return false;
                    }
                }
                return true;
            }
        }

        public static PlayerControl? GetPlayerControlById(byte playerId)
        {
            foreach (PlayerControl pc in PlayerControl.AllPlayerControls)
                if (pc.PlayerId == playerId) return pc;

            return null;
        }
        
        public static IEnumerator CustomCoShowTeam(IntroCutscene __instance, PlayerControl[] teamToShow)
        {
            if (__instance.overlayHandle == null)
            {
                __instance.overlayHandle = DestroyableSingleton<DualshockLightManager>.Instance.AllocateLight();
            }
            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage("Populating from players..");
            yield return ShipStatus.Instance.CosmeticsCache.PopulateFromPlayers();
            __instance.overlayHandle.color = IntroInformation.BackgroundColor;
            Vector3 position = __instance.BackgroundBar.transform.position;
            position.y -= 0.25f;
            __instance.BackgroundBar.transform.position = position;
            __instance.BackgroundBar.material.SetColor("_Color", IntroInformation.BackgroundColor);
            __instance.TeamTitle.text = IntroInformation.TitleText;
            __instance.TeamTitle.color = IntroInformation.BackgroundColor;
            int maxDepth = Mathf.CeilToInt(7.5f);
            for (int i = 0; i < teamToShow.Length; i++)
            {
                PlayerControl playerControl = teamToShow[i];
                if (playerControl)
                {
                    GameData.PlayerInfo data = playerControl.Data;
                    if (data != null)
                    {
                        PoolablePlayer poolablePlayer = __instance.CreatePlayer(i, maxDepth, data, false);
                        if (i == 0 && data.PlayerId == PlayerControl.LocalPlayer.PlayerId)
                        {
                            __instance.ourCrewmate = poolablePlayer;
                        }
                    }
                }
            }
            Color c = __instance.TeamTitle.color;
            Color fade = Color.black;
            Color impColor = IntroInformation.BackgroundColor;
            Vector3 titlePos = __instance.TeamTitle.transform.localPosition;
            float timer = 0f;
            while (timer < 3f)
            {
                timer += Time.deltaTime;
                float num = Mathf.Min(1f, timer / 3f);
                __instance.Foreground.material.SetFloat("_Rad", __instance.ForegroundRadius.ExpOutLerp(num * 2f));
                fade.a = Mathf.Lerp(1f, 0f, num * 3f);
                __instance.FrontMost.color = fade;
                c.a = Mathf.Clamp(FloatRange.ExpOutLerp(num, 0f, 1f), 0f, 1f);
                __instance.TeamTitle.color = c;
                __instance.RoleText.color = c;
                impColor.a = Mathf.Lerp(0f, 1f, (num - 0.3f) * 3f);
                __instance.ImpostorText.color = impColor;
                titlePos.y = 2.7f - num * 0.3f;
                __instance.TeamTitle.transform.localPosition = titlePos;
                __instance.overlayHandle.color = new Color(__instance.overlayHandle.color.r,
                    __instance.overlayHandle.color.g, __instance.overlayHandle.color.b, Mathf.Min(1f, timer * 2f));
                yield return null;
            }
            timer = 0f;
            while (timer < 1f)
            {
                timer += Time.deltaTime;
                float num2 = timer / 1f;
                fade.a = Mathf.Lerp(0f, 1f, num2 * 3f);
                __instance.FrontMost.color = fade;
                __instance.overlayHandle.color = new Color(__instance.overlayHandle.color.r,
                    __instance.overlayHandle.color.g, __instance.overlayHandle.color.b,  1f - fade.a);
                yield return null;
            }
        }

        public static IEnumerator CustomCoIntroCutscene(IntroCutscene __instance)
        {
            // Adapted from: IntroCutscene.cs
            SoundManager.Instance.PlaySound(__instance.IntroStinger, false, 1f, null);
            __instance.LogPlayerRoleData();
            __instance.HideAndSeekPanels.SetActive(false);
            __instance.CrewmateRules.SetActive(false);
            __instance.ImpostorRules.SetActive(false);
            __instance.ImpostorName.gameObject.SetActive(false);
            __instance.ImpostorTitle.gameObject.SetActive(false);
            __instance.ImpostorText.text = IntroInformation.SubtitleText;
            PlayerControl[] list = IntroInformation.YourTeam.Select(x => GetPlayerControlById(x))
                .Where(x => x != null)
                .Select(x => x!)
                .ToArray();
            yield return CustomCoShowTeam(__instance, list);
            // yield return __instance.ShowRole(); let's actually not show their role.
            Object.Destroy(__instance.gameObject);
        }

        public static IEnumerator CustomCoShowIntro(HudManager __instance)
        {
            // Adapted from: HudManager.cs
            while (!ShipStatus.Instance)
            {
                yield return null;
            }
            __instance.IsIntroDisplayed = true;
            DestroyableSingleton<HudManager>.Instance.FullScreen.transform.localPosition = new Vector3(0f, 0f, -250f);
            yield return DestroyableSingleton<HudManager>.Instance.ShowEmblem(true);
            IntroCutscene introCutscene = Object.Instantiate(__instance.IntroPrefab, __instance.transform);
            yield return CustomCoIntroCutscene(introCutscene);
            PlayerControl.LocalPlayer.SetKillTimer(10f);
            ISystemType system = ShipStatus.Instance.Systems[SystemTypes.Sabotage];
            SabotageSystemType? sabotageSystem = system.TryCast<SabotageSystemType>();
            if (sabotageSystem != null)
            {
                
                sabotageSystem.Timer = 10f;
            }
            yield return new CoroutineManager.Il2CppEnumeratorWrapper(ShipStatus.Instance.PrespawnStep());
            PlayerControl.LocalPlayer.AdjustLighting();
            DestroyableSingleton<HudManager>.Instance.SetHudActive(true);
            yield return new CoroutineManager.Il2CppEnumeratorWrapper(__instance.CoFadeFullScreen(Color.black, Color.clear, 0.2f, false));
            __instance.FullScreen.transform.localPosition = new Vector3(0f, 0f, -500f);
            __instance.IsIntroDisplayed = false;
            __instance.CrewmatesKilled.gameObject.SetActive(GameManager.Instance.ShowCrewmatesKilled());
            GameManager.Instance.StartGame();
        }
    }
}