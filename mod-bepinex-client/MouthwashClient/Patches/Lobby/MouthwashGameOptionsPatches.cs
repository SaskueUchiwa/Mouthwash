using System;
using System.Collections.Generic;
using System.Linq;
using HarmonyLib;
using Hazel;
using InnerNet;
using MouthwashClient.Enums;
using Reactor.Utilities;
using UnityEngine;
using Object = UnityEngine.Object;

namespace MouthwashClient.Patches.Lobby
{
    public enum MouthwashOptionType
    {
        Number,
        Boolean,
        Enum
    }

    public abstract class MouthwashGameOptionValue
    {
        public abstract void Serialize(MessageWriter writer);
        public abstract string GetText();
    }

    public class MouthwashGameOptionBooleanValue : MouthwashGameOptionValue
    {
        public bool Enabled;
        
        public static MouthwashGameOptionBooleanValue Deserialize(MessageReader reader)
        {
            bool enabled = reader.ReadBoolean();
            return new MouthwashGameOptionBooleanValue(enabled);
        }

        private MouthwashGameOptionBooleanValue(bool enabled)
        {
            Enabled = enabled;
        }

        public override void Serialize(MessageWriter writer)
        {
            writer.Write(Enabled);
        }

        public override string GetText()
        {
            return Enabled ? "On" : "Off";
        }
    }

    public class MouthwashGameOptionNumberValue : MouthwashGameOptionValue
    {
        public float Value;
        public float Step;
        public float Lower;
        public float Upper;
        public bool ZeroIsInfinity;
        public string Suffix;
        
        public static MouthwashGameOptionNumberValue Deserialize(MessageReader reader)
        {
            float value = reader.ReadSingle();
            float step = reader.ReadSingle();
            float lower = reader.ReadSingle();
            float upper = reader.ReadSingle();
            bool zeroIsInfinity = reader.ReadBoolean();
            string suffix = reader.ReadString();

            return new MouthwashGameOptionNumberValue(value, step, lower, upper, zeroIsInfinity, suffix);
        }

        private MouthwashGameOptionNumberValue(float value, float step, float lower, float upper, bool zeroIsInfinity,
            string suffix)
        {
            Value = value;
            Step = step;
            Lower = lower;
            Upper = upper;
            ZeroIsInfinity = zeroIsInfinity;
            Suffix = suffix;
        }

        public override void Serialize(MessageWriter writer)
        {
            writer.Write(Value);
            writer.Write(Step);
            writer.Write(Lower);
            writer.Write(Upper);
            writer.Write(ZeroIsInfinity);
            writer.Write(Suffix);
        }

        public override string GetText()
        {
            return string.Format(Suffix, Value.ToString("0.##"));
        }
    }

    public class MouthwashGameOptionEnumValue : MouthwashGameOptionValue
    {
        public uint SelectedIdx;
        public string[] Options;

        public static MouthwashGameOptionEnumValue Deserialize(MessageReader reader)
        {
            uint selectedIdx = reader.ReadPackedUInt32();
            List<string> options = new();
            while (reader.BytesRemaining > 0)
            {
                options.Add(reader.ReadString());
            }

            return new MouthwashGameOptionEnumValue(selectedIdx, options.ToArray());
        }

        private MouthwashGameOptionEnumValue(uint selectedIdx, string[] options)
        {
            SelectedIdx = selectedIdx;
            Options = options;
        }

        public override void Serialize(MessageWriter writer)
        {
            writer.WritePacked(SelectedIdx);
            foreach (string option in Options)
            {
                writer.Write(option);
            }
        }

        public override string GetText()
        {
            return Options[SelectedIdx];
        }
    }
    
    public class MouthwashGameOption
    {
        public static MouthwashGameOption? Deserialize(MessageReader reader)
        {
            string category = reader.ReadString();
            ushort priority = reader.ReadUInt16();
            string key = reader.ReadString();
            byte optionType = reader.ReadByte();

            switch ((MouthwashOptionType)optionType)
            {
                case MouthwashOptionType.Boolean:
                    return new MouthwashGameOption(category, key, MouthwashGameOptionBooleanValue.Deserialize(reader),
                        priority);
                case MouthwashOptionType.Number:
                    return new MouthwashGameOption(category, key, MouthwashGameOptionNumberValue.Deserialize(reader),
                        priority);
                case MouthwashOptionType.Enum:
                    return new MouthwashGameOption(category, key, MouthwashGameOptionEnumValue.Deserialize(reader),
                        priority);
                default:
                    throw new ArgumentOutOfRangeException();
            }
        }

        public string Category;
        public string Key;
        public MouthwashGameOptionValue Value;
        public ushort Priority;

        private MouthwashGameOption(string category, string key, MouthwashGameOptionValue value, ushort priority)
        {
            Category = category;
            Key = key;
            Value = value;
            Priority = priority;
        }

        public void Serialize(MessageWriter writer)
        {
            writer.Write(Category);
            writer.Write(Priority);
            writer.Write(Key);
            switch (Value)
            {
                case MouthwashGameOptionEnumValue: writer.Write((byte)MouthwashOptionType.Enum); break;
                case MouthwashGameOptionNumberValue: writer.Write((byte)MouthwashOptionType.Number); break;
                case MouthwashGameOptionBooleanValue: writer.Write((byte)MouthwashOptionType.Boolean); break;
            }
            Value.Serialize(writer);
        }

        public string GetText()
        {
            return $"{Key}: {Value.GetText()}";
        }
    }
    
    public static class MouthwashGameOptionsPatches
    {
        public static GameObject? NumberOptionPrefab;
        public static GameObject? StringOptionPrefab;
        public static GameObject? BooleanOptionPrefab;

        public static List<MouthwashGameOption?> ExistingGameOptions = new();
        public static bool AreOptionsDirty;

        [HarmonyPatch(typeof(GameSettingMenu), nameof(GameSettingMenu.ShowSettingsByGameType))]
        public static class MouthwashShowCorrectGameOptionsPatch
        {
            public static bool Prefix(GameSettingMenu __instance)
            {
                if (NumberOptionPrefab == null)
                {
                    NumberOptionPrefab = Object.Instantiate(__instance.AllItems
                        .First(item => item != null && item.GetComponent<NumberOption>() != null).gameObject);
                    NumberOptionPrefab.SetActive(false);
                }

                if (StringOptionPrefab == null)
                {
                    StringOptionPrefab = Object.Instantiate(__instance.AllItems
                        .First(item => item != null && item.GetComponent<StringOption>() != null).gameObject);
                    StringOptionPrefab.SetActive(false);
                }

                if (BooleanOptionPrefab == null)
                {
                    BooleanOptionPrefab = Object.Instantiate(__instance.AllItems
                        .First(item => item.GetComponent<ToggleOption>() != null).gameObject);
                    BooleanOptionPrefab.SetActive(false);
                }

                GameOptionsMenu optionsParent = __instance.GetComponentInChildren<GameOptionsMenu>(true);
                OptionBehaviour[] existingOptions = __instance.GetComponentsInChildren<OptionBehaviour>(true);

                List<Transform> allOptionItems = new();
                ExistingGameOptions = ExistingGameOptions.OrderBy(a => a?.Priority ?? 0).ToList();
                string lastCategory = "";
                foreach (MouthwashGameOption? gameOption in ExistingGameOptions)
                {
                    if (gameOption == null)
                        continue;

                    if (lastCategory != gameOption.Category && gameOption.Category != "")
                    {
                        NumberOption categoryOption = Object
                            .Instantiate(NumberOptionPrefab, optionsParent.transform)
                            .GetComponent<NumberOption>();

                        categoryOption.gameObject.SetActive(true);
                        categoryOption.gameObject.name = $"{gameOption.Category} (Category)";
                        categoryOption.TitleText.text = gameOption.Category;
                        Transform[] categoryChildren = categoryOption.GetComponentsInChildren<Transform>();
                        foreach (Transform child in categoryChildren)
                        {
                            if (child.gameObject == categoryOption.TitleText.gameObject || child.gameObject == categoryOption.gameObject)
                                continue;
                            
                            Object.Destroy(child.gameObject);
                        }
                        allOptionItems.Add(categoryOption.transform);
                    }
                    lastCategory = gameOption.Category;
                    
                    switch (gameOption.Value)
                    {
                        case MouthwashGameOptionBooleanValue booleanValue:
                            ToggleOption toggleOption =
                                Object.Instantiate(BooleanOptionPrefab, optionsParent.transform)
                                    .GetComponent<ToggleOption>();
                            toggleOption.gameObject.SetActive(true);
                            toggleOption.CheckMark.enabled = booleanValue.Enabled;
                            toggleOption.TitleText.text = gameOption.Key;
                            toggleOption.name = gameOption.Key;
                            toggleOption.OnValueChanged = new Action<OptionBehaviour>(behaviour => { });
                            allOptionItems.Add(toggleOption.transform);
                            break;
                        case MouthwashGameOptionNumberValue numberValue:
                            NumberOption numberOption =
                                Object.Instantiate(NumberOptionPrefab, optionsParent.transform)
                                    .GetComponent<NumberOption>();
                            numberOption.gameObject.SetActive(true);
                            numberOption.TitleText.text = gameOption.Key;
                            numberOption.ValueText.text = string.Format(numberValue.Suffix, numberValue.Value.ToString("0.##"));
                            numberOption.name = gameOption.Key;
                            numberOption.OnValueChanged = new Action<OptionBehaviour>(behaviour => { });
                            allOptionItems.Add(numberOption.transform);
                            // we can't change suffix here, so they're done in a patch below
                            break;
                        case MouthwashGameOptionEnumValue enumValue:
                            StringOption stringOption =
                                Object.Instantiate(StringOptionPrefab, optionsParent.transform)
                                    .GetComponent<StringOption>();
                            stringOption.gameObject.SetActive(true);
                            stringOption.TitleText.text = gameOption.Key;
                            stringOption.ValueText.text = enumValue.Options[enumValue.SelectedIdx];
                            stringOption.name = gameOption.Key;
                            stringOption.OnValueChanged = new Action<OptionBehaviour>(behaviour => { });
                            allOptionItems.Add(stringOption.transform);
                            // we can't change options here, so they're done in a patch below.
                            break;
                    }
                }

                foreach (OptionBehaviour existingOption in existingOptions)
                {
                    Object.Destroy(existingOption.gameObject);
                }

                Scroller scroller = optionsParent.transform.parent.GetComponent<Scroller>();
                __instance.InitializeOptions(allOptionItems.ToArray(), scroller);
                scroller.SetBoundsMax((float)allOptionItems.Count * __instance.YOffset - 2f * __instance.YStart + 1f, 0f);

                __instance.HideNSeekSettings.SetActive(false);
                __instance.RolesSettings.gameObject.SetActive(false);
                __instance.RegularGameSettings.SetActive(false);
                optionsParent.transform.parent.parent.gameObject.SetActive(true);
                __instance.Tabs.SetActive(false);
                ControllerManager.Instance.OpenOverlayMenu(__instance.name, __instance.BackButton,
                    __instance.DefaultButtonSelected._items[0], __instance.ControllerSelectableHidenSeek, false);
                return false;
            }
        }

        public static string GetGameSettingsText()
        {
            string text = "<size=80%>";
            string lastCategory = "";
            foreach (MouthwashGameOption? gameOption in ExistingGameOptions)
            {
                if (gameOption == null)
                    continue;
                
                if (gameOption.Category != lastCategory && gameOption.Category != "")
                {
                    text += $"\n{gameOption.Category}\n";
                }

                lastCategory = gameOption.Category;
                text += gameOption.Category == "" ? "" : "    ";
                text += $"{gameOption.GetText()}\n";
            }

            text += "</size>";

            return text;
        }

        [HarmonyPatch(typeof(LobbyBehaviour), nameof(LobbyBehaviour.FixedUpdate))]
        public static class GameSettingsTextFixedUpdatePatch
        {
            public static bool Prefix(LobbyBehaviour __instance)
            {
                __instance.optionsTimer += Time.fixedDeltaTime;
                if (__instance.optionsTimer < 0.25f)
                {
                    return false;
                }
                __instance.optionsTimer = 0f;
                if (GameOptionsManager.Instance.CurrentGameOptions != null)
                {
                    if (AreOptionsDirty)
                    {
                        ExistingGameOptions = ExistingGameOptions.OrderBy(a => a?.Priority ?? 0).ToList();
                        GameSettingMenu settingMenu = Object.FindObjectOfType<GameSettingMenu>();
                        if (settingMenu != null)
                        {
                            settingMenu.ShowSettingsByGameType();
                        }
                        AreOptionsDirty = false;
                    }
                    DestroyableSingleton<HudManager>.Instance.GameSettings.text = GetGameSettingsText();
                    DestroyableSingleton<HudManager>.Instance.GameSettings.gameObject.SetActive(true);
                }

                return false;
            }
        }

        [HarmonyPatch(typeof(NumberOption), nameof(NumberOption.OnEnable))]
        public static class NumberOptionRemoveDefaultsPatch
        {
            public static bool Prefix(NumberOption __instance)
            {
                return false;
            }
        }
        
        [HarmonyPatch(typeof(ToggleOption), nameof(ToggleOption.OnEnable))]
        public static class ToggleOptionRemoveDefaultsPatch
        {
            public static bool Prefix(ToggleOption __instance)
            {
                return false;
            }
        }

        [HarmonyPatch(typeof(StringOption), nameof(StringOption.OnEnable))]
        public static class StringOptionRemoveDefaultsPatch
        {
            public static bool Prefix(StringOption __instance)
            {
                return false;
            }
        }
        
        [HarmonyPatch(typeof(NumberOption), nameof(NumberOption.FixedUpdate))]
        public static class NumberOptionUseArbitrarySuffixPatch
        {
            public static bool Prefix(NumberOption __instance)
            {
                return false;
            }
        }

        [HarmonyPatch(typeof(NumberOption), nameof(NumberOption.Increase))]
        public static class NumberOptionIncreasePatch
        {
            public static bool Prefix(NumberOption __instance)
            {
                MouthwashGameOption? gameOption = ExistingGameOptions.Find(x => x?.Key == __instance.TitleText.text);
                if (gameOption is not { Value: MouthwashGameOptionNumberValue numberValue })
                    return true;
                
                numberValue.Value = Mathf.Clamp(numberValue.Value + numberValue.Step, numberValue.Lower, numberValue.Upper);
                
                SendUpdateOption(gameOption);
                if (numberValue.ZeroIsInfinity && Mathf.Abs(numberValue.Value) < 0.0001f)
                {
                    __instance.ValueText.text = "∞";
                    return false;
                }

                __instance.ValueText.text = string.Format(numberValue.Suffix, numberValue.Value.ToString("0.##"));
                return false;
            }
        }

        [HarmonyPatch(typeof(NumberOption), nameof(NumberOption.Decrease))]
        public static class NumberOptionDecreasePatch
        {
            public static bool Prefix(NumberOption __instance)
            {
                MouthwashGameOption? gameOption = ExistingGameOptions.Find(x => x?.Key == __instance.TitleText.text);
                if (gameOption is not { Value: MouthwashGameOptionNumberValue numberValue })
                    return true;
                
                numberValue.Value = Mathf.Clamp(numberValue.Value - numberValue.Step, numberValue.Lower, numberValue.Upper);
                
                SendUpdateOption(gameOption);
                if (numberValue.ZeroIsInfinity && Mathf.Abs(numberValue.Value) < 0.0001f)
                {
                    __instance.ValueText.text = "∞";
                    return false;
                }

                __instance.ValueText.text = string.Format(numberValue.Suffix, numberValue.Value.ToString("0.##"));
                return false;
            }
        }

        [HarmonyPatch(typeof(StringOption), nameof(StringOption.FixedUpdate))]
        public static class StringOptionAssignSelectedIdxPatch
        {
            public static bool Prefix(StringOption __instance)
            {
                return false;
            }
        }

        [HarmonyPatch(typeof(StringOption), nameof(StringOption.Increase))]
        public static class StringOptionIncreasePatch
        {
            public static bool Prefix(StringOption __instance)
            {
                MouthwashGameOption? gameOption = ExistingGameOptions.Find(x => x?.Key == __instance.TitleText.text);
                if (gameOption is not { Value: MouthwashGameOptionEnumValue enumValue })
                    return true;

                uint previous = enumValue.SelectedIdx;
                enumValue.SelectedIdx = (uint)Math.Clamp(enumValue.SelectedIdx + 1, 0, enumValue.Options.Length - 1);
                if (enumValue.SelectedIdx == previous)
                    return false;
                __instance.ValueText.text = enumValue.Options[enumValue.SelectedIdx];
                SendUpdateOption(gameOption);
                return false;
            }
        }

        [HarmonyPatch(typeof(StringOption), nameof(StringOption.Decrease))]
        public static class StringOptionDecreasePatch
        {
            public static bool Prefix(StringOption __instance)
            {
                MouthwashGameOption? gameOption = ExistingGameOptions.Find(x => x?.Key == __instance.TitleText.text);
                if (gameOption is not { Value: MouthwashGameOptionEnumValue enumValue })
                    return true;
                
                uint previous = enumValue.SelectedIdx;
                enumValue.SelectedIdx = (uint)Math.Clamp((int)enumValue.SelectedIdx - 1, 0, enumValue.Options.Length - 1);
                if (enumValue.SelectedIdx == previous)
                    return false;
                __instance.ValueText.text = enumValue.Options[enumValue.SelectedIdx];
                SendUpdateOption(gameOption);
                return false;
            }
        }

        [HarmonyPatch(typeof(ToggleOption), nameof(ToggleOption.FixedUpdate))]
        public static class ToggleOptionAssignCheckedPatch
        {
            public static bool Prefix(ToggleOption __instance)
            {
                return false;
            }
        }

        [HarmonyPatch(typeof(ToggleOption), nameof(ToggleOption.Toggle))]
        public static class ToggleOptionTogglePatch
        {
            public static bool Prefix(ToggleOption __instance)
            {
                MouthwashGameOption? gameOption = ExistingGameOptions.Find(x => x?.Key == __instance.TitleText.text);
                if (gameOption is not { Value: MouthwashGameOptionBooleanValue boolValue })
                    return true;

                boolValue.Enabled = !boolValue.Enabled;
                __instance.CheckMark.enabled = boolValue.Enabled;
                SendUpdateOption(gameOption);
                return false;
            }
        }

        [HarmonyPatch(typeof(InnerNetClient), nameof(InnerNetClient.HandleMessage))]
        public static class HandleGameOptionsAddDeletePatch
        {
            public static bool Prefix(InnerNetClient __instance,
                [HarmonyArgument(0)] MessageReader reader, [HarmonyArgument(1)] SendOption sendOption)
            {
                switch (reader.Tag)
                {
                    case (int)MouthwashRootPacketTag.SetGameOption:
                    {
                        reader.ReadUInt16(); // unused sequence id, replaced by ordered reliable packets
                        MouthwashGameOption? gameOption = MouthwashGameOption.Deserialize(reader);
                        MouthwashGameOption? existingGameOption =
                            ExistingGameOptions.Find(x => x?.Key == gameOption.Key);
                        if (existingGameOption == null)
                        {
                            ExistingGameOptions.Add(gameOption);
                        }
                        else
                        {
                            existingGameOption.Value = gameOption.Value;
                        }
                        AreOptionsDirty = true;
                        return false;
                    }
                    case (int)MouthwashRootPacketTag.DeleteGameOption:
                    {
                        reader.ReadUInt16(); // unused sequence id, replaced by ordered reliable packets
                        string optionKey = reader.ReadString();
                        MouthwashGameOption? existingGameOption =
                            ExistingGameOptions.Find(x => x?.Key == optionKey);
                        if (existingGameOption != null)
                        {
                            ExistingGameOptions.Remove(existingGameOption);
                            AreOptionsDirty = true;
                        }
                        return false;
                    }
                }
                return true;
            }
        }
        
        [HarmonyPatch(typeof(LobbyBehaviour), nameof(LobbyBehaviour.Start))]
        public static class PlayerResetAnimationsPatch
        {
            public static void Postfix(LobbyBehaviour __instance)
            {
                ExistingGameOptions.Clear();
            }
        }

        public static void SendUpdateOption(MouthwashGameOption gameOption)
        {
            MessageWriter writer = MessageWriter.Get(SendOption.Reliable);
            writer.StartMessage((int)MouthwashRootPacketTag.SetGameOption);
            writer.Write((ushort)0); // unused sequence id, replaced by ordered reliable packets
            gameOption.Serialize(writer);
            writer.EndMessage();
            DestroyableSingleton<AmongUsClient>.Instance.SendOrDisconnect(writer);
            writer.Recycle();
        }
    }
}