using Hazel;
using InnerNet;
using MouthwashClient.Patches.Lobby;
using Reactor.Utilities.Attributes;
using UnityEngine;

namespace MouthwashClient.Net
{
    [RegisterInIl2Cpp]
    public class DeadBodyGeneric : InnerNetObject
    {
        public enum BodyFacingDirection
        {
            Left,
            Right
        }
        
        public DeadBody? DeadBody;

        public Color color;
        public Color shadowColor;
        public byte playerId;
        public bool hasFallen;
        public BodyFacingDirection facingDirection;

        public void Awake()
        {
            if (DeadBody == null)
            {
                DeadBody = Instantiate(GameManager.Instance.DeadBodyPrefab, transform);
                DeadBody.ParentId = 255;
                DeadBody.enabled = false;
            }
        }

        public override void HandleRpc(byte callId, MessageReader reader)
        {
            base.HandleRpc(callId, reader);
        }

        public void Update()
        {
            if (DeadBody != null)
            {
                DeadBody.transform.localPosition = Vector2.zero;
            }
        }

        public void UpdateColors()
        {
            if (DeadBody == null)
            {
                DeadBody = Instantiate(GameManager.Instance.DeadBodyPrefab);
                DeadBody.ParentId = 255;
                DeadBody.enabled = false;
            }
        
            foreach (SpriteRenderer renderer in DeadBody.bodyRenderers)
            {
                renderer.material.SetColor(PlayerMaterial.BackColor, shadowColor);
                renderer.material.SetColor(PlayerMaterial.BodyColor, color);
                renderer.material.SetColor(PlayerMaterial.VisorColor, Palette.VisorColor);
            }

            DeadBody.enabled = true;
        }

        public override void Deserialize(MessageReader reader, bool initialState)
        {
            hasFallen = reader.ReadBoolean();
            facingDirection = (BodyFacingDirection)reader.ReadByte();
            playerId = reader.ReadByte();
            shadowColor = MouthwashChatMessageAppearance.ReadColor(reader);
            color = MouthwashChatMessageAppearance.ReadColor(reader);
            UpdateColors();
        }

        public override bool Serialize(MessageWriter writer, bool initialState)
        {
            writer.Write(hasFallen);
            writer.Write((byte)facingDirection);
            writer.Write(playerId);
            MouthwashChatMessageAppearance.WriteColor(writer, shadowColor);
            MouthwashChatMessageAppearance.WriteColor(writer, color);
            return true;
        }
    }
}