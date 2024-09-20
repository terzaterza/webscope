import { ParameterMap, ParameterValues } from "./Parameter";
import { WaveformInstance } from "./Session";
import { WaveformStream, WaveformStreamMetadata } from "./Stream";
import { objectMap } from "./Util";
import { AnalogWaveform, BinaryWaveform, Waveform, WaveformFromType, WaveformType } from "./Waveform";

/**
 * Information about input channels
 * @note Frame waveforms are not allowed as inputs
 */
interface InputChannelData {
    name:       string;
    desc?:      string;
    dataType:   "analog" | "binary";
}

/**
 * Map ids to channel information
 */
type InputChannels = {[chID: string]: InputChannelData};

/**
 * Map input channel data to waveforms
 */
export type InputWaveforms<T extends InputChannels> = {
    [ch in keyof T]: WaveformFromType<T[ch]["dataType"]>
};

/**
 * Map of input channel ids to data samples
 */
export type InputSamples<T extends InputChannels> = {
    [ch in keyof T]: Extract<Waveform, {dataType: InputChannelData["dataType"]}>["data"][number]
};

/**
 * Additional information about the decoder streams
 * 
 * Used to display info during runtime when selecting
 * a decoder during stream creation
 */
export interface DecoderMetadata extends WaveformStreamMetadata {
    decoder:    true; /* Used to differentiate decoder streams from others */
    input:      InputChannels;
}

/**
 * Base class for all decoders
 */
export abstract class DecoderStream<T extends DecoderMetadata> extends WaveformStream<T> {

    /**
     * This method should return false if the decoder needs to run
     * on the entire waveform even when new waveform data is only appended to the end
     */
    // public abstract supportsStreaming(): boolean;

    /**
     * Decoder implementation
     * @param input Maps input channel ids to waveform data
     * @param fromStart Says if the decoder should start the decoding process from the start of the waveforms
     * @note Decoding result is return through the stream's `onWaveformReady` method
     */
    protected abstract decode(input: InputWaveforms<T["input"]>, fromStart: boolean): Promise<void>;

    /**
     * Assign the mapping for the ch to the waveform
     */
    public selectInput(ch: keyof T["input"], waveform: WaveformInstance) {
        /* Make sure that the waveform is of the right type */
        // @ts-expect-error - Is this a bug?
        console.assert(this.metadata.input[ch].dataType === waveform.dataType);

        /* If a mapping already exists, remove this from the listener of the previous input waveform */
        if (this.channelMapping[ch]) {
            if (this.channelMapping[ch] === waveform)
                return;

            const index = this.channelMapping[ch].listeners.indexOf(this);
            console.assert(index > -1);

            this.channelMapping[ch].listeners.splice(index, 1);
        }

        /* Add to listeners of the new waveform */
        waveform.listeners.push(this);

        /* Assign the new waveform */
        this.channelMapping[ch] = waveform;

        /* Reset the stream offset since one of the input waveforms
        has completely changed */
        this.streamOffset = 0;
        
        /* Run if all inputs are assigned */
        if (this.allInputsValid())
            this.runDecoder(true);
    }

    /**
     * Convert channel mappings to waveforms and run the decode implementation
     */
    public runDecoder(fromStart: boolean): void {
        /* Assert that all input channels are mapped to a valid waveform */
        /** @todo Make sure to invalidate waveforms when deleting them */
        console.assert(this.allInputsValid());

        /* Map channels to waveforms */
        const inputWaveforms = objectMap(this.metadata.input,
            (chId, chData) => this.channelMapping[chId]?.waveform as Waveform
        ) as InputWaveforms<T["input"]>;

        this.decode(inputWaveforms, fromStart);
    }

    /**
     * Called once when the stream is added to the session
     */
    public start(): void {
        if (this.allInputsValid())
            this.runDecoder(true);
    }

    /**
     * Used by the UI to display current state of the mappings
     * @returns Pairs [Channel name, Waveform name]
     */
    public getInputMappings() {
        return Object.entries(this.channelMapping).map(
            ([id, instance]) => [this.metadata.input[id].name, instance?.name] as [string, string | undefined]
        );
    }

    /**
     * Decoders are all executed locally so there is no need
     * for any extra processing when assigning values to the parameters
     */
    protected onSetParameter(id: keyof T["params"], value: T["params"][keyof T["params"]]["default"]): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Returns true if all input waveforms are assigned
     */
    private allInputsValid(): boolean {
        return Object.entries(this.channelMapping).every(([chId, chData]) => chData?.waveform);
    }

    /**
     * Offset from the start of the waveforms used when continuing the
     * decoding process from non-0 index
     * @note This is reset on selecting new input waveform
     */
    protected streamOffset: number = 0;

    /**
     * Mapping of each channel to the appropriate input instance
     */
    private channelMapping: {[ch in keyof T["input"]]?: WaveformInstance} = {};
}
