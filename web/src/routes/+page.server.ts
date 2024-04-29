interface LauncherRelease {
    version: string;
    notes: string;
    pub_date: string;
    platforms: Record<string, { signature: string; url: string }>;
}

let launcherReleaseCache: LauncherRelease|undefined = undefined;
let lastCachedRelease: Date|undefined = undefined;

/** @type {import("./$types").LayoutServerLoad} */
export async function load({ fetch }) {
    if (launcherReleaseCache && lastCachedRelease && lastCachedRelease.getTime() + 1000 * 60 * 15 > Date.now()) {
        return { launcherRelease: launcherReleaseCache };
    }
    const launcherReleaseUrl = `https://ndekzjeeffavjzlmmupt.supabase.co/storage/v1/object/public/Downloads/launcher-release.json`;

    const latestReleaseReq = await fetch(launcherReleaseUrl);
    const latestReleaseJson = await latestReleaseReq.json() as LauncherRelease;

    launcherReleaseCache = latestReleaseJson;
    lastCachedRelease = new Date();

    return { launcherRelease: latestReleaseJson }
}