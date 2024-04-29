namespace MouthwashClient.Enums
{
    public enum MouthwashRpcPacketTag
    {
        SetChatVisibility = 0x80,
        CloseHud = 0x83,
        Click = 0x86,
        SetOutline = 0x8a,
        SetOpacity,
        BeginPlayerAnimation = 0x8c,
        BeginCameraAnimation,
        SetCountingDown = 0x90,
        ReportDeadBody,
        SetPlayerSpeedModifier = 0x94,
        SetPlayerVisionModifier,
        OverwriteVotingComplete = 0xa0
    }
}