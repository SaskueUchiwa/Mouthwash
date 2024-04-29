using Hazel;
using InnerNet;
using MouthwashClient.Enums;
using Reactor.Utilities.Attributes;
using UnityEngine;
using UnityEngine.Serialization;

namespace MouthwashClient.Net
{
    public enum EdgeAlignment
    {
        None,
        Left,
        Right,
        Bottom = 4,
        LeftBottom,
        RightBottom,
        Top = 8,
        LeftTop,
        RightTop,
        Meeting
    }
    
    [RegisterInIl2Cpp]
    public class CustomNetworkTransformGeneric : InnerNetObject
    {
        public static readonly FloatRange XRange = new(-50f, 50f);
        public static readonly FloatRange YRange = new(-50f, 50f);
        public static readonly LayerMask UILayer = LayerMask.NameToLayer("UI");
        public static readonly LayerMask DefaultLayer = LayerMask.NameToLayer("Default");
        
        public EdgeAlignment alignment = EdgeAlignment.None;
        public Vector2 position = Vector2.zero;
        public float zPosition;
        public uint attachedToNetId;

        public AspectPosition? aspectPosition;
        
        public bool AbsolutePositioning { get; set; }

        public void Start()
        {
            GetAspectPosition();
        }

        public AspectPosition GetAspectPosition()
        {
            if (aspectPosition != null)
                return aspectPosition;
            
            aspectPosition = gameObject.EnsureComponent<AspectPosition>();
            aspectPosition.updateAlways = true;
            return aspectPosition;
        }
    
        public override void HandleRpc(byte callId, MessageReader reader)
        {
            switch (callId)
            {
                case 21: // snap to: the same as used in CustomNetworkTransform
                    position = NetHelpers.ReadVector2(reader);
                    reader.ReadUInt16(); // we can skip the sequence id because it's unused
                    break;
            }
            base.HandleRpc(callId, reader);
        }

        public void Awake()
        {
            
        }

        public void Update()
        {
            if (transform.parent == null && alignment == EdgeAlignment.None)
            {
                transform.parent = DestroyableSingleton<AmongUsClient>.Instance.allObjectsFast.TryGetValue(attachedToNetId, out InnerNetObject parentObject)
                    ? parentObject.transform
                    : null;
                if (!AbsolutePositioning) transform.localPosition = new Vector3(position.x, position.y, zPosition);
            }
        }

        public override bool Serialize(MessageWriter writer, bool initialState)
        {
            writer.Write((byte)alignment);
            NetHelpers.WriteVector2(position, writer);
            writer.Write(zPosition);
            writer.WritePacked(attachedToNetId);
            return true;
        }

        public override void Deserialize(MessageReader reader, bool initialState)
        {
            alignment = (EdgeAlignment)reader.ReadByte();
            AspectPosition _aspectPosition = GetAspectPosition();
            _aspectPosition.Alignment = (AspectPosition.EdgeAlignments)alignment;
            position = NetHelpers.ReadVector2(reader);
            zPosition = reader.ReadSingle();
            attachedToNetId = reader.ReadPackedUInt32();
            if (alignment == EdgeAlignment.None)
            {
                _aspectPosition.enabled = false;
                gameObject.layer = DefaultLayer;
            }
            else
            {
                transform.parent = DestroyableSingleton<HudManager>.Instance.gameObject.transform;
                _aspectPosition.enabled = true;
                _aspectPosition.DistanceFromEdge = new Vector3(-position.x, -position.y, zPosition);
                _aspectPosition.AdjustPosition();
                gameObject.layer = UILayer;
            }
        }
    }
}