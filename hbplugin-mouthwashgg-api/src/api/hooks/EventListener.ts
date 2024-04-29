import { WorkerEvents } from "@skeldjs/hindenburg";
import { BasicEvent } from "@skeldjs/events";
import { ListenerType } from "../enums";
import { BaseRole, RoleCtr } from "..";

const mouthwashEventListenersKey = Symbol("mouthwash:events");

export interface RoleRegisteredEventListenerInfo {
    handler: (ev: BasicEvent) => any;
    type: ListenerType;
    eventName: string;
}

export function EventListener<EventName extends keyof WorkerEvents>(eventName: EventName, listenerType: ListenerType) :
    (
        target: any,
        propertyKey: string,
        descriptor: TypedPropertyDescriptor<
            (ev: any) => any
        >
) => any;
export function EventListener(eventName: string, listenerType: ListenerType) :
    (
        target: any,
        propertyKey: string,
        descriptor: TypedPropertyDescriptor<
            (ev: any) => any
        >
    ) => any;
export function EventListener(listenerType: ListenerType) :
    (
        target: any,
        propertyKey: string,
        descriptor: TypedPropertyDescriptor<
            (ev: any) => any
        >
    ) => any;
export function EventListener(listenerType: ListenerType) :
    (
        target: any,
        propertyKey: string,
        descriptor: TypedPropertyDescriptor<
            (ev: any) => any
        >
    ) => any;
export function EventListener(eventName?: any, listenerType?: ListenerType) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: TypedPropertyDescriptor<
            (ev: BasicEvent) => any
        >
    ) {
        if (!descriptor.value)
            return;

        const actualType = typeof listenerType === "number"
            ? listenerType
            : eventName;

        const actualTarget = target.constructor.prototype;
        const paramType = Reflect.getMetadata("design:paramtypes", actualTarget, propertyKey)?.[0] as typeof BasicEvent|undefined;
        const actualEventName = paramType?.eventName || eventName;

        if (!actualEventName) {
            throw new Error("No event name passed for event emitter, if you're in typescript, make sure 'emitDecoratorMetadata' is enabled in your tsconfig.json");
        }

        const cachedSet: RoleRegisteredEventListenerInfo[]|undefined = Reflect.getOwnMetadata(mouthwashEventListenersKey, target);
        const parentListeners: RoleRegisteredEventListenerInfo[]|undefined = Reflect.getMetadata(mouthwashEventListenersKey, target);
        const eventListeners = cachedSet || (parentListeners ? [...parentListeners] : []);
        if (cachedSet === undefined) {
            Reflect.defineMetadata(mouthwashEventListenersKey, eventListeners, actualTarget);
        }

        eventListeners.push({
            type: actualType,
            handler: descriptor.value,
            eventName: actualEventName
        });
    };
}

export function getRoleEventListeners(pluginCtr: BaseRole): RoleRegisteredEventListenerInfo[] {
    let a = pluginCtr;
    while (a !== null) {
        const classListeners = Reflect.getOwnMetadata(mouthwashEventListenersKey, a);
        if (classListeners !== undefined) {
            return classListeners;
        }
        a = Object.getPrototypeOf(a);
    }
    return [];
}
