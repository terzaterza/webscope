import { ParameterMap, ParameterValues } from "./Parameter";
import { ChannelWaveforms, StreamChannels, WaveformStream, WaveformStreamMetadata } from "./Stream";
import { objectMap } from "./Util";
import { Waveform, WaveformFromType, WaveformType } from "./Waveform";

export interface DecoderMetadata extends WaveformStreamMetadata {
    input: StreamChannels;
}

type InputSamples<T extends DecoderMetadata> = {
    [ch in keyof T["input"]]: WaveformFromType<T["input"][ch]["dataType"]>["data"][number]
};

/**
 * Interface for all decoders
 * 
 * The decode function is called by the stream when
 * corresponding input waveforms are updated
 */
export abstract class DecoderStream<T extends DecoderMetadata> extends WaveformStream<T> {

    /**
     * Decoder implementation
     * @param input Maps input channel ids to waveform data
     * @param fromStart Says if the decoder should start the decoding
     * process from the start of the waveforms
     * @note Decoding result is returned through the stream's `onWaveformReady` method
     */
    protected abstract decode(input: ChannelWaveforms<T["input"]>, fromStart: boolean): Promise<void>;

    /**
     * Validate input and run the decode implementation
     */
    public runDecoder(input: ChannelWaveforms<T["input"]>, fromStart: boolean): boolean {
        /* Assert that all input channels are mapped to a valid waveform */
        /** @todo Make sure to invalidate waveforms when deleting them */
        if (!this.allInputsValid(input)) {
            console.log("Invalid inputs! Decoder:", this.metadata, "Inputs:", input);
            return false;
        }

        console.log("Running decoder:", this.metadata.name, "| From start:", fromStart);
        this.decode(input, fromStart);

        return true;
    }

    /**
     * Called once when the stream is added to the session
     */
    public start(): void {
        
    }

    /**
     * Get samples at the specified time point (time rounded down to the nearest sample)
     * @note To be used only if all signals are analog or binary
     * @note Will throw an error if the time is out of bounds for any of the waveforms
     */
    protected getInputAtTime(waveforms: ChannelWaveforms<T["input"]>, time: number): InputSamples<T> {
        // @ts-expect-error - Assumes that no input waveform is a FrameWaveform
        return objectMap(waveforms, (ch, waveform) => waveform.data[Math.floor(time * waveform.sampleRate)]);
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
    private allInputsValid(input: ChannelWaveforms<T["input"]>): boolean {
        return Object.entries(this.metadata.input).every(([ch, data]) => (
            input[ch] && input[ch].dataType === this.metadata.input[ch].dataType
        ));
    }

}
