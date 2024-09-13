import { Decoder, DecoderMetadata } from "./Decoder";
import { ParameterMap, ParameterValues } from "./Parameter";
import { objectMap } from "./Util";
import { Waveform, WaveformFromType, WaveformType } from "./Waveform";

type StreamOutputType   = { [ch: string]: WaveformType };
type ChannelCallback    = (data: Waveform) => void;

/**
 * Information required when registering the stream
 */
interface StreamMetadataMutable {
    name:   string;
    params: ParameterMap;
    output: StreamOutputType;
}

/**
 * Metadata is readonly so that `as const` types would be passed to the stream class
 */
export type WaveformStreamMetadata = Readonly<StreamMetadataMutable>;

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
interface StreamDatabaseItem {
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


/**
 * Stream which takes in a decoder instance and on input
 * waveform update it triggers the decoding
 */
// export class DecoderWaveformStream extends WaveformStream {

//     constructor(private decoder: Decoder<DecoderMetadata>) {
//         super(objectMap(decoder.metadata.output, (k, v) => v.dataType));
        
//         this.parameters = objectMap(decoder.metadata.params, (k, v) => v.default);
//     }

//     /**
//      * 
//      */
//     // public decode(input: , params) {

//     // }

//     private parameters: ParameterValues<ParameterMap>;
            
//     // @todo Add decoders for modulation like PSK, QAM, ...
// }

// /**
//  * Stream which takes in a text input and parses it
//  * @note Currently supports only one channel
//  */
// export class TextDelimitedStream extends WaveformStream {

//     constructor(
//         dataType: WaveformType,
//         private text: string,
//         private delimiter: string
//     ) {
//         super({"CH1": dataType});
//     }
    
//     public start(): void {
//         const waveform = TextDelimitedStream.parseText(
//             this.text,
//             this.delimiter,
//             this.outputChannels["CH1"]
//         );

//         this.onWaveformReady("CH1", waveform);
//     }
    
//     public static parseText(text: string, delimiter: string, dataType: WaveformType): Waveform {
//         const samplesRaw = text.split(delimiter);
//         switch (dataType) {
//             case "analog": return {
//                 dataType: "analog",
//                 data: samplesRaw.map((v) => parseFloat(v)),
//                 sampleRate: 1
//             };
//             case "binary": return {
//                 dataType: "binary",
//                 data: samplesRaw.map((v) => (v === "1" ? 1 : 0)),
//                 sampleRate : 1
//             };
//             case "frame": throw new Error("Frame waveforms not supported");
//         }
//     }
// }

// export class FileWaveformStream extends WaveformStream {
    
//     public readFile(file: File) {
//         // can also use TextDelimitedStream.parseText
//     }
// }

// export class SerialPortWaveformStream extends WaveformStream {
//     // private port: SerialPort;
// }

// export class NetworkWaveformStream extends WaveformStream {
//     // private websocket: WebSocket
// }