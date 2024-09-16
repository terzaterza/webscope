import { ParameterMap, ParameterValues } from "./Parameter";
import { Waveform, WaveformFromType, WaveformType } from "./Waveform";

type StreamOutputType   = { [ch: string]: WaveformType };
type ChannelCallback    = (data: Waveform) => void;

/**
 * Information required when registering the stream
 */
export interface WaveformStreamMetadata {
    name:   string;
    params: ParameterMap;
    output: StreamOutputType;
}

/**
 * Base class (interface) for all streams which
 * calls the registered callback once more data is available
 */
export abstract class WaveformStream<T extends WaveformStreamMetadata> {

    /**
     * @param metadata Should be provided directly by the derived class
     * @param defaultParameters Is provided by the session on waveform instantiation
     */
    constructor(public readonly metadata: T, defaultParameters: ParameterValues<T["params"]>) {
        this.parameterValues = {...defaultParameters};
    }

    /**
     * Start data acquisition
     * 
     * This is called by the session after the callback has been
     * assigned and the stream instance has been created and setup
     */
    // public abstract start(): void;

    /**
     * Used by the Session object to set the callback
     * for updating the data of the correct waveform instance
     */
    public setCallback(ch: string, callback: ChannelCallback): void {
        console.assert(ch in this.metadata.output);
        this.dataReadyCallback[ch] = callback;
    }

    /**
     * Call from derived stream class once the
     * raw data has been converted to a waveform
     */
    protected onWaveformReady(data: {[ch in keyof T["output"]]: WaveformFromType<T["output"][ch]>}): void {
        for (const [ch, waveform] of Object.entries(data)) {
            /** @todo Verify that data is actually of data type */
            
            /* Check that data type is correct */
            console.assert(waveform.dataType === this.metadata.output[ch]);
    
            if (this.dataReadyCallback[ch])
                this.dataReadyCallback[ch](waveform);
        }
    }

    /**
     * Get value for the current parameter setting
     */
    protected getParameter(parameter: keyof T["params"]) {
        return this.parameterValues[parameter];
    }

    private dataReadyCallback: {[ch: string]: ChannelCallback} = {};
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
