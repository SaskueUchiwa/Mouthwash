export enum RootMessageTag {
    HostGame,
    JoinGame,
    StartGame,
    RemoveGame,
    RemovePlayer,
    GameData,
    GameDataTo,
    JoinedGame,
    EndGame,
    GetGameList,
    AlterGame,
    KickPlayer,
    WaitForHost,
    Redirect,
    MasterServerList,
    GetGameListV2 = 16,
    ReportPlayer,
    SetGameSession = 20, // unimplemented in-game
    SetActivePodType,
    QueryPlatformIds,
    QueryLobbyInfo, // unimplemented in-game
}
