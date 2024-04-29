using System;
using System.Collections;
using System.Collections.Generic;
using HarmonyLib;
using Hazel;
using MouthwashClient.Enums;
using MouthwashClient.Patches.Lobby;
using MouthwashClient.Patches.OnlinePlay;
using Reactor.Networking.Extensions;
using Reactor.Utilities;
using UnityEngine;

namespace MouthwashClient.Patches.Game
{
    public enum KeyframeEnabledProperties
    {
        Opacity,
        HatOpacity,
        PetOpacity,
        SkinOpacity,
        NameOpacity,
        PrimaryColor,
        SecondaryColor,
        VisorColor,
        Scale,
        Position,
        Rotation
    }

    public class PlayerAnimationKeyframe
    {
        public ushort EnabledPropertiesBitfield;
        
        public float Offset;
        public float Duration;

        public float Opacity = 1f;
        public float HatOpacity = 1f;
        public float PetOpacity = 1f;
        public float SkinOpacity = 1f;
        public float NameOpacity = 1f;
        public Color? PrimaryColor;
        public Color? SecondaryColor;
        public Color? VisorColor;
        public Vector2 Scale = Vector2.one;
        public Vector2 Position = Vector2.zero;
        public float Rotation = 0f;

        public PlayerAnimationKeyframe(ushort enabledPropertiesBitfield)
        {
            EnabledPropertiesBitfield = enabledPropertiesBitfield;
        }

        public bool IsPropertyEnabled(KeyframeEnabledProperties property)
        {
            return (EnabledPropertiesBitfield & (1 << (byte)property)) > 0;
        }

        public void Deserialize(MessageReader reader)
        {
            Offset = reader.ReadPackedUInt32();
            Duration = reader.ReadPackedUInt32();
            
            if (IsPropertyEnabled(KeyframeEnabledProperties.Opacity)) Opacity = reader.ReadSingle();
            if (IsPropertyEnabled(KeyframeEnabledProperties.HatOpacity)) HatOpacity = reader.ReadSingle();
            if (IsPropertyEnabled(KeyframeEnabledProperties.PetOpacity)) PetOpacity = reader.ReadSingle();
            if (IsPropertyEnabled(KeyframeEnabledProperties.SkinOpacity)) SkinOpacity = reader.ReadSingle();
            if (IsPropertyEnabled(KeyframeEnabledProperties.NameOpacity)) NameOpacity = reader.ReadSingle();
            if (IsPropertyEnabled(KeyframeEnabledProperties.PrimaryColor)) PrimaryColor = MouthwashChatMessageAppearance.ReadColor(reader);
            if (IsPropertyEnabled(KeyframeEnabledProperties.SecondaryColor)) SecondaryColor = MouthwashChatMessageAppearance.ReadColor(reader);
            if (IsPropertyEnabled(KeyframeEnabledProperties.VisorColor)) VisorColor = MouthwashChatMessageAppearance.ReadColor(reader);
            if (IsPropertyEnabled(KeyframeEnabledProperties.Scale)) Scale = reader.ReadVector2();
            if (IsPropertyEnabled(KeyframeEnabledProperties.Position)) Position = reader.ReadVector2();
            if (IsPropertyEnabled(KeyframeEnabledProperties.Rotation)) Rotation = reader.ReadSingle();
        }
    }

    public static class PlayerAnimationPatches
    {
        public static Dictionary<byte, PlayerAnimationKeyframe> PlayerAnimationStates = new();
        public static Dictionary<byte, List<IEnumerator>> PlayerAnimationCoroutines = new();

        [HarmonyPatch(typeof(PlayerControl), nameof(PlayerControl.HandleRpc))]
        public static class PlayerBeginAnimationMessageHandlePatch
        {
            public static bool Prefix(PlayerControl? __instance,
                [HarmonyArgument(0)] byte callId, [HarmonyArgument(1)] MessageReader reader)
            {
                switch (callId)
                {
                    case (byte)MouthwashRpcPacketTag.BeginPlayerAnimation:
                        bool doReset = reader.ReadBoolean();
                        ushort enabledPropertiesBitfield = reader.ReadUInt16();
                        List<PlayerAnimationKeyframe> keyframes = new();
                        while (reader.BytesRemaining > 0)
                        {
                            PlayerAnimationKeyframe keyframe = new(enabledPropertiesBitfield);
                            keyframe.Deserialize(reader.ReadMessage());
                            keyframes.Add(keyframe);
                        }

                        if (doReset)
                        {
                            List<IEnumerator> coroutines = GetPlayerAnimationCoroutines(__instance);
                            foreach (IEnumerator coroutine in coroutines)
                            {
                                __instance.StopCoroutine(coroutine);
                            }

                            coroutines.Clear();
                            ResetPlayerAnimation(__instance);
                        }

                        PlayPlayerAnimation(__instance, keyframes.ToArray());
                        break;
                }

                return true;
            }
        }

        public static List<IEnumerator> GetPlayerAnimationCoroutines(PlayerControl? player)
        {
            if (PlayerAnimationCoroutines.TryGetValue(player.PlayerId, out List<IEnumerator>? existingCoroutines))
                return existingCoroutines;

            List<IEnumerator> newCoroutines = new();
            PlayerAnimationCoroutines.Add(player.PlayerId, newCoroutines);
            return newCoroutines;
        }

        public static PlayerAnimationKeyframe GetPlayerAnimationState(PlayerControl? player)
        {
            if (PlayerAnimationStates.TryGetValue(player.PlayerId, out PlayerAnimationKeyframe? existingState))
                return existingState;

            PlayerAnimationKeyframe newState = new(0xffff);
            PlayerAnimationStates.Add(player.PlayerId, newState);
            return newState;
        }

        public static void ResetPlayerAnimation(PlayerControl? player)
        {
            PlayerAnimationKeyframe currentState = GetPlayerAnimationState(player);
            currentState.Opacity = currentState.HatOpacity =
                currentState.PetOpacity = currentState.SkinOpacity = currentState.NameOpacity = 1f;
            currentState.PrimaryColor = currentState.SecondaryColor = currentState.VisorColor = null;
            currentState.Scale = Vector2.one;
            currentState.Position = Vector2.zero;
            currentState.Rotation = 0f;
            Color bodyColor = player.cosmetics.currentBodySprite.BodySprite.color;
            player.cosmetics.currentBodySprite.BodySprite.color =
                new Color(bodyColor.r, bodyColor.g, bodyColor.b, currentState.Opacity);
            Color backColor = player.cosmetics.hat.BackLayer.color;
            Color frontColor = player.cosmetics.hat.FrontLayer.color;
            player.cosmetics.hat.BackLayer.color =
                new Color(backColor.r, backColor.g, backColor.b, currentState.HatOpacity);
            player.cosmetics.hat.FrontLayer.color =
                new Color(frontColor.r, frontColor.g, frontColor.b, currentState.HatOpacity);
              Color petColor = player.cosmetics.CurrentPet.renderers[0].color;
              player.cosmetics.CurrentPet.renderers[0].color =
                new Color(petColor.r, petColor.g, petColor.b, currentState.PetOpacity);
            Color skinColor = player.cosmetics.skin.layer.color;
            player.cosmetics.skin.layer.color =
                new Color(skinColor.r, skinColor.g, skinColor.b, currentState.SkinOpacity);
            Color nameColor = player.cosmetics.nameText.color;
            player.cosmetics.nameText.color =
                new Color(nameColor.r, nameColor.g, nameColor.b, currentState.NameOpacity);
            CosmeticLoadPatches.SetCustomColors(player.cosmetics.currentBodySprite.BodySprite,
                Palette.PlayerColors[player.Data.DefaultOutfit.ColorId],
                Palette.ShadowColors[player.Data.DefaultOutfit.ColorId],
                Palette.VisorColor);
            CosmeticLoadPatches.SetCustomColors(player.cosmetics.hat.FrontLayer,
                Palette.PlayerColors[player.Data.DefaultOutfit.ColorId],
                Palette.ShadowColors[player.Data.DefaultOutfit.ColorId],
                Palette.VisorColor);
            CosmeticLoadPatches.SetCustomColors(player.cosmetics.hat.BackLayer,
                Palette.PlayerColors[player.Data.DefaultOutfit.ColorId],
                Palette.ShadowColors[player.Data.DefaultOutfit.ColorId],
                Palette.VisorColor);
        }

        public static void PlayPlayerAnimation(PlayerControl? player, PlayerAnimationKeyframe[] keyframes)
        {
            List<IEnumerator> coroutines = GetPlayerAnimationCoroutines(player);
            for (int i = 0; i < keyframes.Length; i++)
            {
                PlayerAnimationKeyframe keyframe = keyframes[i];
                coroutines.Add(player.StartCoroutine(CoPlayPlayerAnimationKeyframe(player, keyframe, i == keyframes.Length - 1)));
            }
        }

        public static IEnumerator CoPlayPlayerAnimationKeyframe(PlayerControl? player, PlayerAnimationKeyframe keyframe, bool isLastKeyframe)
        {
            for (float t = 0f; t <= keyframe.Offset; t += Time.deltaTime * 1000f)
            {
                yield return null;
            }

            PlayerAnimationKeyframe currentState = GetPlayerAnimationState(player);
            float startOpacity = currentState.Opacity;
            float startHatOpacity = currentState.HatOpacity;
            float startPetOpacity = currentState.PetOpacity;
            float startSkinOpacity = currentState.SkinOpacity;
            float startNameOpacity = currentState.NameOpacity;
            Color startPrimaryColor =
                currentState.PrimaryColor ?? Palette.PlayerColors[player.Data.DefaultOutfit.ColorId];
            Color startSecondaryColor =
                currentState.SecondaryColor ?? Palette.ShadowColors[player.Data.DefaultOutfit.ColorId];
            Color startVisorColor = currentState.VisorColor ?? Palette.VisorColor;
            Vector2 startScale = currentState.Scale;
            Vector2 startPosition = currentState.Position;
            float startRotation = currentState.Rotation;

            for (float t = 0f; t <= keyframe.Duration; t += Time.deltaTime * 1000f)
            {
                float x = t / keyframe.Duration;
                if (float.IsNaN(x)) x = 1f;
                if (keyframe.IsPropertyEnabled(KeyframeEnabledProperties.Opacity))
                    currentState.Opacity = Mathf.Lerp(startOpacity, keyframe.Opacity, x);
                if (keyframe.IsPropertyEnabled(KeyframeEnabledProperties.HatOpacity))
                    currentState.HatOpacity = Mathf.Lerp(startHatOpacity, keyframe.HatOpacity, x);
                if (keyframe.IsPropertyEnabled(KeyframeEnabledProperties.PetOpacity))
                    currentState.PetOpacity = Mathf.Lerp(startPetOpacity, keyframe.PetOpacity, x);
                if (keyframe.IsPropertyEnabled(KeyframeEnabledProperties.SkinOpacity))
                    currentState.SkinOpacity = Mathf.Lerp(startSkinOpacity, keyframe.SkinOpacity, x);
                if (keyframe.IsPropertyEnabled(KeyframeEnabledProperties.NameOpacity))
                    currentState.NameOpacity = Mathf.Lerp(startNameOpacity, keyframe.NameOpacity, x);
                if (keyframe.IsPropertyEnabled(KeyframeEnabledProperties.PrimaryColor) && keyframe.PrimaryColor != null)
                    currentState.PrimaryColor = Color.Lerp(startPrimaryColor, keyframe.PrimaryColor!.Value, x);
                if (keyframe.IsPropertyEnabled(KeyframeEnabledProperties.SecondaryColor) &&
                    keyframe.SecondaryColor != null)
                    currentState.SecondaryColor = Color.Lerp(startSecondaryColor, keyframe.SecondaryColor!.Value, x);
                if (keyframe.IsPropertyEnabled(KeyframeEnabledProperties.VisorColor) && keyframe.VisorColor != null)
                    currentState.VisorColor = Color.Lerp(startVisorColor, keyframe.VisorColor!.Value, x);
                if (keyframe.IsPropertyEnabled(KeyframeEnabledProperties.Scale))
                    currentState.Scale = Vector2.Lerp(startScale, keyframe.Scale, x);
                if (keyframe.IsPropertyEnabled(KeyframeEnabledProperties.Position))
                    currentState.Position = Vector2.Lerp(startPosition, keyframe.Position, x);
                if (keyframe.IsPropertyEnabled(KeyframeEnabledProperties.Rotation))
                    currentState.Rotation = Mathf.Lerp(startRotation, keyframe.Rotation, x);
                yield return null;
            }

            if (isLastKeyframe)
            {
                if (keyframe.IsPropertyEnabled(KeyframeEnabledProperties.Opacity))
                    currentState.Opacity = keyframe.Opacity;
                if (keyframe.IsPropertyEnabled(KeyframeEnabledProperties.HatOpacity))
                    currentState.HatOpacity = keyframe.HatOpacity;
                if (keyframe.IsPropertyEnabled(KeyframeEnabledProperties.PetOpacity))
                    currentState.PetOpacity = keyframe.PetOpacity;
                if (keyframe.IsPropertyEnabled(KeyframeEnabledProperties.SkinOpacity))
                    currentState.SkinOpacity = keyframe.SkinOpacity;
                if (keyframe.IsPropertyEnabled(KeyframeEnabledProperties.NameOpacity))
                    currentState.NameOpacity = keyframe.NameOpacity;
                if (keyframe.IsPropertyEnabled(KeyframeEnabledProperties.PrimaryColor) && keyframe.PrimaryColor != null)
                    currentState.PrimaryColor = keyframe.PrimaryColor.Value;
                if (keyframe.IsPropertyEnabled(KeyframeEnabledProperties.SecondaryColor) &&
                    keyframe.SecondaryColor != null)
                    currentState.SecondaryColor = keyframe.SecondaryColor.Value;
                if (keyframe.IsPropertyEnabled(KeyframeEnabledProperties.VisorColor) && keyframe.VisorColor != null)
                    currentState.VisorColor = keyframe.VisorColor;
                if (keyframe.IsPropertyEnabled(KeyframeEnabledProperties.Scale))
                    currentState.Scale = keyframe.Scale;
                if (keyframe.IsPropertyEnabled(KeyframeEnabledProperties.Position))
                    currentState.Position = keyframe.Position;
                if (keyframe.IsPropertyEnabled(KeyframeEnabledProperties.Rotation))
                    currentState.Rotation = keyframe.Rotation;
            }
        }

        public static void UpdatePlayerAppearance(PlayerControl? player, PlayerAnimationKeyframe keyframe)
        {
            if (keyframe.IsPropertyEnabled(KeyframeEnabledProperties.Opacity))
            {
                Color bodyColor = player.cosmetics.currentBodySprite.BodySprite.color;
                player.cosmetics.currentBodySprite.BodySprite.color =
                    new Color(bodyColor.r, bodyColor.g, bodyColor.b, keyframe.Opacity);
                if (keyframe.IsPropertyEnabled(KeyframeEnabledProperties.HatOpacity))
                {
                    Color backColor = player.cosmetics.hat.BackLayer.color;
                    Color frontColor = player.cosmetics.hat.FrontLayer.color;
                    player.cosmetics.hat.BackLayer.color =
                        new Color(backColor.r, backColor.g, backColor.b, keyframe.HatOpacity);
                    player.cosmetics.hat.FrontLayer.color =
                        new Color(frontColor.r, frontColor.g, frontColor.b, keyframe.HatOpacity);
                }

                if (keyframe.IsPropertyEnabled(KeyframeEnabledProperties.PetOpacity))
                {
                    Color petColor = player.cosmetics.CurrentPet.renderers[0].color;
                    player.cosmetics.CurrentPet.renderers[0].color =
                        new Color(petColor.r, petColor.g, petColor.b, keyframe.PetOpacity);
                }

                if (keyframe.IsPropertyEnabled(KeyframeEnabledProperties.SkinOpacity))
                {
                    Color skinColor = player.cosmetics.skin.layer.color;
                    player.cosmetics.skin.layer.color =
                        new Color(skinColor.r, skinColor.g, skinColor.b, keyframe.SkinOpacity);
                }

                if (keyframe.IsPropertyEnabled(KeyframeEnabledProperties.NameOpacity))
                {
                    Color nameColor = player.cosmetics.nameText.color;
                    player.cosmetics.nameText.color =
                        new Color(nameColor.r, nameColor.g, nameColor.b, keyframe.NameOpacity);
                }

                CosmeticLoadPatches.SetCustomColors(player.cosmetics.currentBodySprite.BodySprite,
                    keyframe.IsPropertyEnabled(KeyframeEnabledProperties.PrimaryColor) && keyframe.PrimaryColor.HasValue
                        ? keyframe.PrimaryColor!.Value
                        : Palette.PlayerColors[player.Data.DefaultOutfit.ColorId],
                    keyframe.IsPropertyEnabled(KeyframeEnabledProperties.SecondaryColor) &&
                    keyframe.SecondaryColor.HasValue
                        ? keyframe.SecondaryColor!.Value
                        : Palette.ShadowColors[player.Data.DefaultOutfit.ColorId],
                    keyframe.IsPropertyEnabled(KeyframeEnabledProperties.VisorColor) && keyframe.VisorColor.HasValue
                        ? keyframe.VisorColor!.Value
                        : Palette.VisorColor);
                CosmeticLoadPatches.SetCustomColors(player.cosmetics.hat.FrontLayer,
                    keyframe.IsPropertyEnabled(KeyframeEnabledProperties.PrimaryColor) && keyframe.PrimaryColor.HasValue
                        ? keyframe.PrimaryColor!.Value
                        : Palette.PlayerColors[player.Data.DefaultOutfit.ColorId],
                    keyframe.IsPropertyEnabled(KeyframeEnabledProperties.SecondaryColor) &&
                    keyframe.SecondaryColor.HasValue
                        ? keyframe.SecondaryColor!.Value
                        : Palette.ShadowColors[player.Data.DefaultOutfit.ColorId],
                    keyframe.IsPropertyEnabled(KeyframeEnabledProperties.VisorColor) && keyframe.VisorColor.HasValue
                        ? keyframe.VisorColor!.Value
                        : Palette.VisorColor);
                CosmeticLoadPatches.SetCustomColors(player.cosmetics.hat.BackLayer,
                    keyframe.IsPropertyEnabled(KeyframeEnabledProperties.PrimaryColor) && keyframe.PrimaryColor.HasValue
                        ? keyframe.PrimaryColor!.Value
                        : Palette.PlayerColors[player.Data.DefaultOutfit.ColorId],
                    keyframe.IsPropertyEnabled(KeyframeEnabledProperties.SecondaryColor) &&
                    keyframe.SecondaryColor.HasValue
                        ? keyframe.SecondaryColor!.Value
                        : Palette.ShadowColors[player.Data.DefaultOutfit.ColorId],
                    keyframe.IsPropertyEnabled(KeyframeEnabledProperties.VisorColor) && keyframe.VisorColor.HasValue
                        ? keyframe.VisorColor!.Value
                        : Palette.VisorColor);
                // TODO: scale, position and rotation (sounds like a nightmare)
            }
        }

        [HarmonyPatch(typeof(PlayerControl), nameof(PlayerControl.OnDisable))]
        public static class PlayerResetAnimationsPatch
        {
            public static void Postfix(PlayerControl __instance)
            {
                PlayerAnimationStates.Remove(__instance.PlayerId);
                PlayerAnimationCoroutines.Remove(__instance.PlayerId);
            }
        }
        
        public static PlayerControl GetPlayerControlById(byte playerId)
        {
            foreach (var player in PlayerControl.AllPlayerControls)
                if (player.PlayerId == playerId) return player;

                return null;
        }
        
        [HarmonyPatch(typeof(AmongUsClient), nameof(AmongUsClient.Update))]
        public static class UpdatePlayerAppearanceAnimationFrame
        {
            public static bool Prefix(AmongUsClient __instance)
            {
                foreach ((byte playerId, PlayerAnimationKeyframe? keyframe) in PlayerAnimationStates)
                {
                    PlayerControl? player = GetPlayerControlById(playerId);
                    if (player != null && keyframe != null)
                        UpdatePlayerAppearance(player, keyframe);
                }

                return true;
            }
        }
    }
}