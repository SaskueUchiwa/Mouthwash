using System;
using System.Collections.Generic;
using System.Linq;
using HarmonyLib;
using Hazel;
using Hazel.Udp;
using Reactor.Utilities;
using Rewired;
using xCloud;

namespace MouthwashClient.Patches.Network
{
    public static class HazelPacketOrderingPatches
    {
        private static bool _receivedFirstNonce;
        private static ushort _nextExpectedNonce = 1;

        public struct ReceivedPacket
        {
            public MessageReader reader;
            public int bytesReceived;
        }
        private static Dictionary<ushort, ReceivedPacket> _packetQueue = new();
        
        public static void Reset() {
            _packetQueue = new Dictionary<ushort, ReceivedPacket>();
            _receivedFirstNonce = false;
            _nextExpectedNonce = 1;
        }
        
        [HarmonyPatch(typeof(UdpConnection), nameof(UdpConnection.HandleReceive))]
        public static class HazelPacketOrderingPatch {
            public static bool Prefix(UdpConnection __instance, [HarmonyArgument(0)] MessageReader reader, [HarmonyArgument(1)] int bytesReceived) {
                if (reader.Buffer[0] == 1 || reader.Buffer[0] == 12)
                {
                    reader.ReadUInt16();
                    ushort nonce = (ushort)((reader.Buffer[1] << 8) + reader.Buffer[2]);
                    __instance.SendAck(nonce);

                    lock (_packetQueue) {
                        if (!_receivedFirstNonce)
                        {
                            _nextExpectedNonce = nonce;
                            _receivedFirstNonce = true;
                        }
                        
                        if (nonce < _nextExpectedNonce)
                        {
                            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogWarning($"Server is behind (got {nonce}, expected {_nextExpectedNonce})");
                            return false;
                        }
                        _packetQueue[nonce] = new ReceivedPacket{ reader = reader, bytesReceived = bytesReceived };
                        if (nonce != _nextExpectedNonce)
                        {
                            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogWarning($"Server is ahead, waiting for {_nextExpectedNonce} to process {nonce}");
                            return false;
                        }

                        while (_packetQueue.TryGetValue(_nextExpectedNonce, out ReceivedPacket processReader))
                        {
                            try
                            {
                                __instance.InvokeDataReceived(SendOption.Reliable, processReader.reader, 3,
                                    processReader.bytesReceived);
                                _packetQueue.Remove(_nextExpectedNonce);
                            }
                            catch (Exception e)
                            {
                                PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogError($"Error while processing reliable packet {nonce}: {e}");
                            }

                            ushort a = _nextExpectedNonce;
                            _nextExpectedNonce++;
                        }
                    }

                    return false;
                }
                return true;
            }
        }

        [HarmonyPatch(typeof(UnityUdpClientConnection), nameof(UnityUdpClientConnection.ConnectAsync))]
        public static class RestartExpectedNoncePatch
        {
            public static bool Prefix(UnityUdpClientConnection __instance)
            {
                Reset();
                return true;
            }
        }
    }
}