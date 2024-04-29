using AmongUs.Data;
using Hazel;
using InnerNet;
using MouthwashClient.Services;
using Reactor.Utilities;
using Reactor.Utilities.Attributes;
using UnityEngine;

namespace MouthwashClient.Net
{
    [RegisterInIl2Cpp]
    public class SoundSource : InnerNetObject
    {
        public AudioSource AudioPlayerObject;

        public float duration;
        public uint resourceId;
        public AudioType audioType;
        public float volumeModifier;
        public bool looping;
        public bool paused;
        public float pitch;
        public float soundFalloffMultiplier;
        public float soundFalloffStartingRadius;
        public float seek;

        void Start()
        {
            AudioPlayerObject = gameObject.EnsureComponent<AudioSource>();
            AudioPlayerObject.playOnAwake = false;
        }

        public override void HandleRpc(byte callId, MessageReader reader)
        {
        }

        public void UpdateAudioPlayback()
        {
            AudioPlayerObject = gameObject.EnsureComponent<AudioSource>();
            AudioPlayerObject.playOnAwake = false;
            
            if (!RemoteResourceService.CachedAssets.TryGetValue(resourceId, out Object? audioClipAsset) || audioClipAsset == null)
            {
                PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogError($"Audio clip not found: resource id={resourceId}, asset={audioClipAsset}");
                return;
            }

            AudioClip? audioClip = audioClipAsset.TryCast<AudioClip>();
            if (audioClip == null)
            {
                PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogError($"Invalid audio clip: resource id={resourceId}, asset={audioClipAsset}");
                return;
            }

            AudioPlayerObject.clip = audioClip;
            AudioPlayerObject.pitch = pitch;
            AudioPlayerObject.volume = DataManager.Settings.Audio.SfxVolume * volumeModifier;
            AudioPlayerObject.loop = looping;
            AudioPlayerObject.time = seek;

            if (paused) AudioPlayerObject.Pause(); else AudioPlayerObject.Play();
        }

        public override bool Serialize(MessageWriter writer, bool initialState)
        {
            writer.WritePacked(resourceId);
            writer.Write(pitch);
            writer.Write(volumeModifier);
            writer.Write(looping);
            writer.Write((byte)audioType);
            writer.Write(seek);
            writer.Write(paused);
            return true;
        }

        public override void Deserialize(MessageReader reader, bool initialState)
        {
            resourceId = reader.ReadPackedUInt32();
            pitch = reader.ReadSingle();
            volumeModifier = reader.ReadSingle();
            looping = reader.ReadBoolean();
            audioType = (AudioType)reader.ReadByte();
            seek = reader.ReadSingle();
            paused = reader.ReadBoolean();
            UpdateAudioPlayback();
        }
    }
}