import * as shell from "@tauri-apps/api/shell";

import { writable } from "svelte/store";
import { loading, unavailable } from "./accounts";

export interface ChangeLogEntry {
    version: string;
    date_released: string;
    release_download_bytes: number;
    release_download_sha256: number;
    release_url: string;
    notes: string[];
}

export const gameInstalledPathState = writable<typeof loading|typeof unavailable|string>(loading);
export const gameInstalledVersionState = writable<typeof loading|typeof unavailable|string>(loading);
export const gameRemoteVersionState = writable<typeof loading|typeof unavailable|Error|ChangeLogEntry>(loading);

export const amongUsProcess = writable<typeof unavailable|shell.Child>(unavailable);