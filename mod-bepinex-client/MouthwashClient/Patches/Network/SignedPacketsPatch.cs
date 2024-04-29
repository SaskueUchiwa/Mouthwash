using System;
using System.Linq;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using HarmonyLib;
using Hazel.Udp;
using Il2CppInterop.Runtime.InteropTypes.Arrays;
using MouthwashClient.Services;
using Reactor.Utilities;
using SocketFlags = Il2CppSystem.Net.Sockets.SocketFlags;

namespace MouthwashClient.Patches.Network
{
    public static class SignedPacketsPatch
    {
        [HarmonyPatch(typeof(UnityUdpClientConnection), nameof(UnityUdpClientConnection.WriteBytesToConnection))]
        public static class UnityUdpClientConnection_WriteBytesToConnection
        {
            public static void Prefix(
                [HarmonyArgument(0)] ref Il2CppStructArray<byte> bytes,
                [HarmonyArgument(1)] ref int length) => SignByteArray(ref bytes, ref length);
        }

        [HarmonyPatch(typeof(UnityUdpClientConnection), nameof(UnityUdpClientConnection.WriteBytesToConnectionSync))]
        public static class UnityUdpClientConnection_WriteBytesToConnectionSync
        {
            public static void Prefix(
                [HarmonyArgument(0)] ref Il2CppStructArray<byte> bytes,
                [HarmonyArgument(1)] ref int length) => SignByteArray(ref bytes, ref length);
        }

        private static void SignByteArray(ref Il2CppStructArray<byte> bytes, ref int length)
        {
            if (bytes[0] == 0x80 || bytes[0] == 10 || bytes[0] == 12) return;
            
            UserInformationWithAuthToken userInformation = LoginService.GetLoginInformation();
            string clientId = userInformation.Id;
            string[] parts = clientId.Split("-");
            byte[] uuidAsBytes = new byte[16];
            int i = 0;
            foreach (string part in parts)
            {
                byte[] partBytes = Convert.FromHexString(part);
                partBytes.CopyTo(uuidAsBytes, i);
                i += partBytes.Length;
            }

            byte[] secretKey = Encoding.UTF8.GetBytes(userInformation.ClientToken);
            HMACSHA1 hmac = new HMACSHA1(secretKey);
            byte[] signBytes = hmac.ComputeHash(bytes);

            byte[] fullSignedPacket = new byte[1 + uuidAsBytes.Length + signBytes.Length + length];
            fullSignedPacket[0] = 0x80;
            uuidAsBytes.CopyTo(fullSignedPacket, 0x01);
            signBytes.CopyTo(fullSignedPacket, 0x01 + uuidAsBytes.Length);
            bytes.CopyTo(fullSignedPacket, 0x01 + uuidAsBytes.Length + signBytes.Length);

            bytes = fullSignedPacket;
            length = fullSignedPacket.Length;
        }
    }
}