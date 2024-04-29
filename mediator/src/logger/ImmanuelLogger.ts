import * as kleur from "kleur";
import * as util from "util";

/**
 * Configuration for an {@link ImmanuelLogger} instance.
 */
export interface LoggerConfig {
    /**
     * Whether the logger is in development mode, i.e., whether it should show "debug" messages.
     */
    development: boolean;
}

/**
 * A logger for handling formatted text to the consoloe with different log levels
 * and sub-loggers for derived functions.
 */
export class ImmanuelLogger {
    /**
     * @param config The configuration for the logger.
     * @param label The label to identify the log output for the current process in the server. 
     */
    constructor(public readonly config: LoggerConfig, public readonly label: string) {}

    /**
     * Create a new sub-logger with a derived label for identifying log lines from
     * certain places in the process.
     */
    derive(label: string) {
        return new ImmanuelLogger(this.config, this.label + " > " + label);
    }

    /**
     * Emit a debug mesage to the console.
     * 
     * Note that this only displays if the logger is in development mode, see
     * {@link LoggerConfig.development}.
     */
    debug(message: string, ...fmt: any[]) {
        if (!this.config.development)
            return;

        console.log(kleur.bgBlack(kleur.white(this.label) + " > ") + " " + kleur.cyan("debug ~ ") + util.format(message, ...fmt));
    }

    /**
     * Emit a standard log message to the console.
     */
    log(message: string, ...fmt: any[]) {
        console.log(kleur.bgBlack(kleur.white(this.label) + " > ") + " " + kleur.cyan("log ~ ") + util.format(message, ...fmt)); // todo: multiple log transport
    }

    /**
     * Emit an information log message to the console.
     */
    info(message: string, ...fmt: any[]) {
        console.log(kleur.bgBlack(kleur.white(this.label) + " > ") + " " + kleur.cyan("info ~ ") + util.format(message, ...fmt));
    }

    /**
     * Emit a warning log message to the console.
     */
    warn(message: string, ...fmt: any[]) {
        console.log(kleur.bgBlack(kleur.white(this.label) + " > ") + " " + kleur.cyan("warn ~ ") + util.format(message, ...fmt));
    }

    /**
     * Emit an error log message to the console.
     */
    error(message: string, ...fmt: any[]) {
        console.log(kleur.bgBlack(kleur.white(this.label) + " > ") + " " + kleur.cyan("error ~ ") + util.format(message, ...fmt));
    }
}