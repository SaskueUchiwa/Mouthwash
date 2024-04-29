import { RoleCtr } from "hbplugin-mouthwashgg-api";
import { InfractionName } from "../enums";

const anticheatExceptionsKey = Symbol("mouthwash:anticheat.exceptions");

export function AnticheatExceptions(exceptions: InfractionName[]) {
    return function<T extends RoleCtr>(constructor: T) {
        Reflect.defineMetadata(anticheatExceptionsKey, new Set(exceptions), constructor);
        return constructor;
    }
}

export function getAnticheatExceptions(pluginCtr: RoleCtr): Set<InfractionName> {
    return Reflect.getMetadata(anticheatExceptionsKey, pluginCtr) || new Set;
}