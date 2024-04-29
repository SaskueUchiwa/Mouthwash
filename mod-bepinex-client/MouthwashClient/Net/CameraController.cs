using System.Collections;
using System.Collections.Generic;
using Hazel;
using InnerNet;
using MouthwashClient.Enums;
using MouthwashClient.Patches.Lobby;
using Reactor.Networking.Extensions;
using Reactor.Utilities;
using Reactor.Utilities.Attributes;
using UnityEngine;
using UnityEngine.Serialization;

namespace MouthwashClient.Net
{
    public struct CameraAnimationKeyframe
    {
        public float Offset;
        public float Duration;
        public Vector2 Position;
        public float Rotation;
        public Color Color;
    }

    public struct AnimationState
    {
        public Vector2 Position;
        public float Rotation;
        public Color Color;
    }
    
    [RegisterInIl2Cpp]
    public class CameraController : InnerNetObject
    {
        private List<IEnumerator> _activeAnimations = new();
        public Vector2 positionOffset = Vector2.zero;

        public AnimationState AnimationFrameState = new(){ Position = Vector2.zero, Rotation = 0f, Color = Color.clear };
    
        public override void HandleRpc(byte callId, MessageReader reader)
        {
            switch ((MouthwashRpcPacketTag)callId)
            {
            case MouthwashRpcPacketTag.BeginCameraAnimation:
                bool doReset = reader.ReadBoolean();
                List<CameraAnimationKeyframe> keyframes = new();
                while (reader.BytesRemaining > 0)
                {
                    MessageReader animationReader = reader.ReadMessage();
                    float offset = animationReader.ReadPackedUInt32();
                    float duration = animationReader.ReadPackedUInt32();
                    Vector2 position = animationReader.ReadVector2();
                    float rotation = animationReader.ReadSingle();
                    Color color = MouthwashChatMessageAppearance.ReadColor(animationReader);
                    keyframes.Add(new CameraAnimationKeyframe
                    {
                        Offset = offset,
                        Duration = duration,
                        Position = position,
                        Rotation = rotation,
                        Color = color
                    });
                }

                if (doReset)
                {
                    foreach (IEnumerator animation in _activeAnimations) gameObject.EnsureComponent<CoroutineManager>().StopCoroutine(animation);
                    _activeAnimations.Clear();
                    ResetAppearance();
                }

                PlayAnimation(keyframes.ToArray());
                break;
            }
        }

        public bool DoesCameraExist()
        {
            return OwnerId == PlayerControl.LocalPlayer.OwnerId
                   && DestroyableSingleton<HudManager>.InstanceExists
                   && DestroyableSingleton<HudManager>.Instance.PlayerCam != null;
        }

        public void Awake()
        {
            if (!DoesCameraExist())
                return;
            
            DestroyableSingleton<HudManager>.Instance.PlayerCam.Target = this;
        }

        public void OnDestroy()
        {
            if (!DoesCameraExist())
                return;
            
            DestroyableSingleton<HudManager>.Instance.PlayerCam.Target = PlayerControl.LocalPlayer;
        }

        public void Update()
        {
            if (!DoesCameraExist())
                return;

            transform.position = PlayerControl.LocalPlayer.transform.position
                                 + new Vector3(AnimationFrameState.Position.x, AnimationFrameState.Position.y, 0f)
                                 + new Vector3(positionOffset.x, positionOffset.y, 0f);
            transform.rotation = Quaternion.Euler(0f, 0f, AnimationFrameState.Rotation);
        }

        public override bool Serialize(MessageWriter writer, bool initialState)
        {
            NetHelpers.WriteVector2(positionOffset, writer);
            return true;
        }

        public override void Deserialize(MessageReader reader, bool initialState)
        {
            positionOffset = NetHelpers.ReadVector2(reader);
        }

        public void ResetAppearance()
        {
            AnimationFrameState = new(){ Position = Vector2.zero, Rotation = 0f, Color = Color.clear };
            if (DestroyableSingleton<HudManager>.Instance.FullScreen != null)
            {
                DestroyableSingleton<HudManager>.Instance.FullScreen.gameObject.SetActive(false);
            }
        }

        public void PlayAnimation(CameraAnimationKeyframe[] keyframes)
        {
            for (int i = 0; i < keyframes.Length; i++)
            {
                foreach (CameraAnimationKeyframe keyframe in keyframes)
                    _activeAnimations.Add(
                        gameObject.EnsureComponent<CoroutineManager>()
                            .StartCoroutine(CoPlayAnimationKeyframe(keyframe, i == keyframes.Length - 1)));
            }
        }

        public IEnumerator CoPlayAnimationKeyframe(CameraAnimationKeyframe keyframe, bool isLastKeyframe)
        {
            for (float t = 0f; t < keyframe.Offset; t += Time.deltaTime * 1000f)
                yield return null;

            Vector2 startPosition = AnimationFrameState.Position;
            float startRotation = AnimationFrameState.Rotation;
            Color startColor = AnimationFrameState.Color;

            for (float t = 0f; t < keyframe.Duration; t += Time.deltaTime * 1000f)
            {
                float x = t / keyframe.Duration;
                if (float.IsNaN(x)) x = 1f;
                AnimationFrameState = new AnimationState
                {
                    Position = Vector2.Lerp(startPosition, keyframe.Position, x),
                    Rotation = Mathf.Lerp(startRotation, keyframe.Rotation, x),
                    Color = Color.Lerp(startColor, keyframe.Color, x)
                };
                DestroyableSingleton<HudManager>.Instance.FullScreen.gameObject.SetActive(true);
                DestroyableSingleton<HudManager>.Instance.FullScreen.color = AnimationFrameState.Color;
                if (AnimationFrameState.Color.a < 0.05f)
                {
                    DestroyableSingleton<HudManager>.Instance.FullScreen.gameObject.SetActive(false);
                }

                yield return null;
            }

            if (isLastKeyframe)
            {
                AnimationFrameState = new AnimationState
                {
                    Position = keyframe.Position,
                    Rotation = keyframe.Rotation,
                    Color = keyframe.Color
                };
                DestroyableSingleton<HudManager>.Instance.FullScreen.gameObject.SetActive(true);
                DestroyableSingleton<HudManager>.Instance.FullScreen.color = AnimationFrameState.Color;
                if (AnimationFrameState.Color.a < 0.05f)
                {
                    DestroyableSingleton<HudManager>.Instance.FullScreen.gameObject.SetActive(false);
                }
            }
        }
    }
}