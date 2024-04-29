using System;
using System.Collections.Generic;
using System.Linq;
using HarmonyLib;
using Hazel;
using Il2CppSystem;
using InnerNet;
using MouthwashClient.Enums;
using MouthwashClient.Patches.Lobby;
using Reactor.Utilities;
using Reactor.Utilities.Attributes;
using Reactor.Utilities.Extensions;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace MouthwashClient.Net
{
    [RegisterInIl2Cpp]
    public class ClickBehaviour : InnerNetObject
    {
        public float maxTimer = 0f;
        public float currentTime = 0f;
        public bool saturated = false;
        public Color color = Color.white;
        public bool countingDown = false;
        public ushort[] keys = {};

        private Material? _buttonMaterial;
        private Graphic? _buttonGraphic;
        private TextMeshPro? _timerText;
    
        public override void HandleRpc(byte callId, MessageReader reader)
        {
            base.HandleRpc(callId, reader);
        }

        public void Start()
        {
            _buttonGraphic = GetComponent<Graphic>();
            
            KillButton killButton = DestroyableSingleton<HudManager>.Instance.KillButton;
            _buttonMaterial = Instantiate(killButton.graphic.GetMaterial()).DontDestroy();
            if (_buttonGraphic != null)
            {
                _buttonGraphic.spriteRenderer.SetMaterial(_buttonMaterial);
            }
            _timerText = Instantiate(killButton.cooldownTimerText, transform);

            PassiveButton passiveButton = GetComponent<PassiveButton>();
            passiveButton.OnClick = new Button.ButtonClickedEvent();
            passiveButton.OnClick.AddListener(new System.Action(RpcClick));
            passiveButton.Colliders = passiveButton.Colliders.AddItem(GetComponent<BoxCollider2D>()).ToArray();
        }

        public void Update()
        {
            if (!countingDown)
            {
                UpdateTimerText();
                return;
            }
            
            currentTime -= Time.deltaTime;
            if (currentTime < 0f)
            {
                currentTime = 0f;
            }

            if (keys.Any(x => Input.GetKeyDown((KeyCode)x))) RpcClick();
            UpdateTimerText();
        }

        public void UpdateTimerText()
        {
            float timerSeconds = Mathf.Clamp01(currentTime / maxTimer);
            if (_buttonGraphic != null)
            {
                _buttonGraphic.spriteRenderer.material.SetFloat("_Percent", timerSeconds);
                _buttonGraphic.spriteRenderer.material.SetFloat("_Desat", saturated ? 0f : 1f);
                _buttonGraphic.spriteRenderer.color = saturated ? Palette.EnabledColor : Palette.DisabledClear;
            }

            if (_timerText != null)
                _timerText.gameObject.SetActive(timerSeconds > 0f && _buttonGraphic.spriteRenderer.enabled);

            if (timerSeconds > 0f)
            {
                _timerText.text = Mathf.CeilToInt(currentTime).ToString();
                _timerText.color = color;
            }
        }

        public override bool Serialize(MessageWriter writer, bool initialState)
        {
            writer.Write(maxTimer);
            writer.Write(currentTime);
            writer.Write(countingDown);
            writer.Write(saturated);
            MouthwashChatMessageAppearance.WriteColor(writer, color);
            foreach (ushort key in keys)
            {
                writer.Write(key);
            }
            return true;
        }

        public override void Deserialize(MessageReader reader, bool initialState)
        {
            maxTimer = reader.ReadSingle();
            currentTime = reader.ReadSingle();
            countingDown = reader.ReadBoolean();
            saturated = reader.ReadBoolean();
            color = MouthwashChatMessageAppearance.ReadColor(reader);
            List<ushort> newKeys = new();
            while (reader.BytesRemaining > 0)
            {
                newKeys.Add(reader.ReadUInt16());
            }

            keys = newKeys.ToArray();
        }

        public void RpcClick()
        {
            DestroyableSingleton<AmongUsClient>.Instance.SendRpc(NetId, (byte)MouthwashRpcPacketTag.Click);
        }
    }
}