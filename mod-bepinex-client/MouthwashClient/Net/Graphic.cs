using Hazel;
using InnerNet;
using MouthwashClient.Services;
using Reactor.Utilities;
using Reactor.Utilities.Attributes;
using UnityEngine;

namespace MouthwashClient.Net
{
    [RegisterInIl2Cpp]
    public class Graphic : InnerNetObject
    {
        public SpriteRenderer spriteRenderer;
        public uint assetId;

        void Start()
        {
            spriteRenderer = gameObject.EnsureComponent<SpriteRenderer>();
        }

        void Update()
        {
            spriteRenderer.enabled = MeetingHud.Instance == null;
        }

        public override void HandleRpc(byte callId, MessageReader reader)
        {
            
        }

        public override bool Serialize(MessageWriter writer, bool initialState)
        {
            writer.WritePacked(assetId);
            return true;
        }

        public override void Deserialize(MessageReader reader, bool initialState)
        {
            assetId = reader.ReadPackedUInt32();
            Texture2D? cachedAsset = RemoteResourceService.TryGetCachedAsset<Texture2D>(assetId);
            if (cachedAsset != null)
            {
                if (spriteRenderer == null)
                    spriteRenderer = gameObject.EnsureComponent<SpriteRenderer>();

                if (spriteRenderer == null)
                {
                    PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogError($"No sprite renderer on this graphic! (netid={NetId})");
                    return;
                }
                spriteRenderer.sprite = Sprite.Create(cachedAsset,
                    new Rect(Vector2.zero, new Vector2(cachedAsset.width, cachedAsset.height)),
                    new Vector2(.5f, .5f));
                spriteRenderer.sprite.name = cachedAsset.name;
            }
        }
    }
}