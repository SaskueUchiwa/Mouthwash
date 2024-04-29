const fs = require("fs");
const path = require("path");

/**
 * @typedef Collider
 * @property {String} name
 * @property {String} path
 */

/**
 * @typedef Layer
 * @property {String} name
 * @property {Collider[]} colliders
 */

/**
 * @typedef {{ [key: string]: Layer }} LayersData
 */

/**
 * @typedef CollidersData
 * @property {LayersData} layers
 */

/**
 * @typedef CollidersJson
 * @property {CollidersData} colliders
 */

/**
 * @param {Number} layer_id
 */
function do_include_layer(layer_id) {
    return layer_id !== 0 &&
        layer_id !== 2;
}

const allow = [
    "Airship(Clone)/Electrical/Shadows"
];

const allDelete = [
    "Lobby(Clone)/ShipRoom",
    "MiraShip(Clone)/LaunchPad",
    "MiraShip(Clone)/Office",
    "MiraShip(Clone)/Garden",
    "MiraShip(Clone)/WoodHall",
    "MiraShip(Clone)/Outside",
    "MiraShip(Clone)/CarpetHall",
    "MiraShip(Clone)/Cafe",
    "MiraShip(Clone)/SkyBridge",
    "MiraShip(Clone)/Locker",
    "MiraShip(Clone)/SkyCarpetHall",
    "MiraShip(Clone)/Admin",
    "MiraShip(Clone)/Storage",
    "MiraShip(Clone)/Decontam",
    "MiraShip(Clone)/LabHall/Footsteps",
    "MiraShip(Clone)/Laboratory",
    "MiraShip(Clone)/Reactor",
    "PolusShip(Clone)/Dropship",
    "PolusShip(Clone)/Science",
    "PolusShip(Clone)/Electrical/Sounds/Tile",
    "PolusShip(Clone)/LifeSupport",
    "PolusShip(Clone)/Office",
    "PolusShip(Clone)/RightTube",
    "PolusShip(Clone)/Admin",
    "PolusShip(Clone)/LowerDecon",
    "PolusShip(Clone)/UpperDecon",
    "PolusShip(Clone)/Weapons",
    "PolusShip(Clone)/Electrical",
    "PolusShip(Clone)/RightTubeTop",
    "PolusShip(Clone)/LifeSupport/BoilerRoom",
    "PolusShip(Clone)/LifeSupport/Drip",
    "PolusShip(Clone)/LifeSupport/Drip (1)",
    "PolusShip(Clone)/Storage",
    "PolusShip(Clone)/Comms",
    "PolusShip(Clone)/Security",
    "Airship(Clone)/Engine",
    "Airship(Clone)/HallwayMain",
    "Airship(Clone)/Showers",
    "Airship(Clone)/Security",
    "Airship(Clone)/Brig",
    "Airship(Clone)/Comms",
    "Airship(Clone)/Armory/SFX/woodstep",
    "Airship(Clone)/Cockpit",
    "Airship(Clone)/Armory",
    "Airship(Clone)/Ejection",
    "Airship(Clone)/Kitchen",
    "Airship(Clone)/HallwayPortrait",
    "Airship(Clone)/Electrical",
    "Airship(Clone)/Medbay",
    "Airship(Clone)/Ventilation",
    "Airship(Clone)/Storage",
    "Airship(Clone)/Lounge",
    "Airship(Clone)/Records",
    "Airship(Clone)/GapRoom",
    "Airship(Clone)/Medbay",
    "Airship(Clone)/HallwayL",
    "Airship(Clone)/MeetingRoom",
    "Airship(Clone)/Vault/vault_goldtop",
    "Airship(Clone)/HallwayMain/Darkroom"
];

/**
 * @param {Collider} collider
 */
function do_include_collider(collider) {
    if (allow.includes(collider.name))
        return true;

	if (collider.name.includes("Submerged")) {
		if (
			collider.name.includes("Hallway") ||
			collider.name.endsWith("Room") ||
			collider.name.endsWith("Elevator") ||
			collider.name.endsWith("ExitHall") ||
			collider.name.endsWith("Decontamination")
		) {
			return false;
		}
	}

    if (allDelete.includes(collider.name) && collider.path.endsWith("Z"))
        return false;

    if (collider.name === "Airship(Clone)/Vault" || collider.name === "Airship(Clone)/Vault/vault_goldtop")
        return false;

    if (collider.name.includes("OneWay") && collider.path.endsWith("Z"))
        return false;

    if (collider.name.includes("Shadow"))
        return false;

    if (collider.name.includes("Console") || collider.name.endsWith("Scanner") || collider.name.includes("Panel") || collider.name.includes("panel_"))
        return false;

    if (collider.name.endsWith("/Room"))
        return false;

    if (collider.name.toLowerCase().includes("door") || collider.name.includes("Logger") || collider.name.includes("Vert") || collider.name.includes("DeconDoor") || collider.name.includes("Hort"))
        return false;

    if (collider.name.includes("Task") || collider.name.includes("task_") || collider.name.includes("taks_"))
        return false;

    if (/Vent\d?$/.test(collider.name) || collider.name.includes("Platform") || collider.name.includes("Ladder") || collider.name.includes("Divert"))
        return false;

    if (collider.name.includes("Sounds") || collider.name.toLowerCase().includes("sfx"))
        return false;

    return true;
}

const mapBounds = {
    "skeld.json": {
        minx: -27.777778,
        miny: 6.790123,
        maxx: 19.242063,
        maxy: -19.827160
    }
}

const gapFills = {
    "skeld.json": [
        [{ x: -17.709921, y: -1.654321 }, { x: -17.559524, y: -1.654321 }],
        [{ x: -10.317460, y: -0.024691 }, { x: -9.920635, y: -0.024691 }],
        [{ x: -8.730159, y: -0.616284 }, { x: -8.382937, y: -0.617284 }],
        [{ x: 8.184524, y: -4.024691 }, { x: 8.184524, y: -4.123457 }],
        [{ x: 14.831349, y: -4.222222 }, { x: 14.831349, y: -4.419753 }],
        [{ x: 0.000000, y: -7.925926}, { x: 0.099206, y: -7.925926 }],
        [{ x: -16.220238, y: -1.703704 }, { x: -16.121032, y: -1.703704 }],
        [{ x: -1.835317, y: -4.518519 }, { x:-1.438492, y: -4.518519 }]
    ]
}

/**
 * @param {String} filename
 */
function compile_collider(filename) {
    const input_data = fs.readFileSync(filename, "utf8");

    /**
     * @type {CollidersJson}
     */
    const input_json = JSON.parse(input_data);
    const lines = [];

    for (const key of Object.keys(input_json.colliders.layers)) {
        const layer_id = parseInt(key);
        const layer = input_json.colliders.layers[layer_id];

        if (!do_include_layer(layer_id))
            continue;

        for (const collider of layer.colliders) {
            if (!do_include_collider(collider)) {
                continue;
            }

            const points = collider.path
                .match(/-?\d+(\.\d+)?, ?-?\d+(\.\d+)?/g)
                .map(str => {
                    const [ xStr, yStr ] = str.split(",");
                    return { x: parseFloat(xStr), y: parseFloat(yStr) };
                });

            if (collider.path.endsWith("Z")) {
                points.push({
                    x: points[0].x,
                    y: points[0].y
                });
            }

            lines.push(points);
        }
    }

    const mapName = path.basename(filename);
    if (gapFills[mapName]) {
        lines.push(...gapFills[mapName]);
    }

    if (mapBounds[mapName]) {
        lines.push([
            {
                x: mapBounds[mapName].minx,
                y: mapBounds[mapName].miny
            },
            {
                x: mapBounds[mapName].minx,
                y: mapBounds[mapName].maxy
            },
            {
                x: mapBounds[mapName].maxx,
                y: mapBounds[mapName].maxy
            },
            {
                x: mapBounds[mapName].maxx,
                y: mapBounds[mapName].miny
            },
            {
                x: mapBounds[mapName].minx,
                y: mapBounds[mapName].miny
            }
        ]);
    }

    fs.writeFileSync(path.resolve(__dirname, "./out/" + path.basename(filename)), JSON.stringify(lines), "utf8");
}

const pathname = path.resolve(__dirname, ".");
const filenames = fs.readdirSync(pathname);
try {
    fs.mkdirSync(path.resolve(__dirname, "out"));
} catch (e) {

}

for (const filename of filenames) {
    if (filename.endsWith(".json")) {
		try {
			compile_collider(path.resolve(pathname, filename));
		} catch (e) {

		}
    }
}
