import { ParameterMap, ParameterValues } from "./Parameter";
import { Waveform, WaveformFromType, WaveformType } from "./Waveform";

export type StreamChannels = {[ch: string]: {
    dataType: WaveformType;
    name?: string; // More descriptive name than `ch`
    desc?: string;
}};

export type ChannelWaveforms<T extends StreamChannels> =
    {[ch in keyof T]: WaveformFromType<T[ch]["dataType"]>};

export type WaveformUpdateCallback = (waveform: Waveform) => void;

/**
 * Information required when registering the stream
 */
export interface WaveformStreamMetadata {
    name:   string;
    desc?:  string;
    params: ParameterMap;
    output: StreamChannels;
}

/**
 * Base class (interface) for all streams which
 * calls the registered callback once more data is available
 */
export abstract class WaveformStream<T extends WaveformStreamMetadata> {

    /**
     * @param metadata Should be provided directly by the derived class
     * @param initialParameters Is provided by the session on waveform instantiation
     */
    constructor(public readonly metadata: T, initialParameters: ParameterValues<T["params"]>) {
        this.parameterValues = {...initialParameters};
    }

    /**
     * Start data acquisition
     * 
     * This is called by the session after the callback has been
     * assigned and the stream instance has been created and setup
     */
    public abstract start(): void;

    /**
     * This method is called by the UI when a parameter value
     * has been changed
     * 
     * @returns true if parameter was set successfully
     */
    public async trySetParameter(id: keyof T["params"], value: T["params"][typeof id]["default"]): Promise<void> {
        const promise = this.onSetParameter(id, value);

        promise.then(() => {
            this.parameterValues[id] = value;
        }).catch(() => {
            console.warn("Parameter setting failed!", this, id, value);
            /** @todo This branch is for testing only, `catch` here is not needed */
        })
        return promise;
    }

    /**
     * Used by the Session object to set the callback
     * for updating the data of the correct waveform instance
     * @todo Move this to constructor and make the callback non-optional
     */
    public setCallback(ch: string, callback: WaveformUpdateCallback): void {
        console.assert(ch in this.metadata.output);
        this.waveformUpdateCallbacks[ch] = callback;
    }

    /**
     * Get a copy of parameter values
     */
    public getParameterValues() {
        return {...this.parameterValues};
    }

    /**
     * Abstract method to allow streams to react to setting new
     * parameter values
     * 
     * This can be used to communicate with serial port devices
     * for setting parameters dynamically as UI sets new values
     */
    protected abstract onSetParameter(id: keyof T["params"], value: T["params"][typeof id]["default"]): Promise<void>;

    /**
     * Call from derived stream class once the
     * raw data has been converted to a waveform
     */
    protected onWaveformReady(data: Partial<ChannelWaveforms<T["output"]>>): void {
        for (const [ch, waveform] of Object.entries(data)) {
            console.assert(ch in this.metadata.output);
            console.assert(waveform.dataType === this.metadata.output[ch].dataType);
    
            if (this.waveformUpdateCallbacks[ch])
                this.waveformUpdateCallbacks[ch](waveform);
        }
    }

    // Used by the UI to update the display as the waveform data changes
    private waveformUpdateCallbacks: {[ch: string]: WaveformUpdateCallback} = {};
    // Current parameter values
    private parameterValues: ParameterValues<T["params"]>;
}


/* Alias for a class that is derived from WaveformStream */
type StreamInstantiable<T extends WaveformStreamMetadata> =
    new (p: ParameterValues<T["params"]>) => WaveformStream<T>;

/**
 * Information kept about all registered streams
 */
export interface StreamDatabaseItem {
    metadata:   WaveformStreamMetadata;
    stream:     StreamInstantiable<any>;
}

/**
 * Here are all registered streams stored, this should be
 * requested when wanting to instantiate a new stream to
 * get a list of candidates
 */
const streamDatabase: {[category: string]: StreamDatabaseItem[]} = {};

/**
 * Possible categories for stream registration
 */
type StreamCategory = "Simulated" | "Decoder" | "Serial Device" | "Network Device" | "Other";

/**
 * Register a stream implementation to be available during runtime
 * @param metadata Information about the stream, should be implemented with `as const`
 * @param stream Class implementation of the stream, requires an empty constructor
 */
export function registerStream<T extends WaveformStreamMetadata>(
    category:   StreamCategory,
    metadata:   T,
    stream:     StreamInstantiable<T>
) {
    if (!(category in streamDatabase)) {
        streamDatabase[category] = [{metadata: metadata, stream: stream}];
        return;
    }

    /** @todo Can check if this metadata is already registered */
    streamDatabase[category].push({metadata: metadata, stream: stream});
}

/**
 * Used by UI (SessionComponent) to create a select list of all streams
 */
export function getStreamList() {
    return {...streamDatabase};
}
