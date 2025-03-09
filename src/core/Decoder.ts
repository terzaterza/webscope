import { WaveformInstance } from "./Session";
import { ChannelWaveforms, StreamChannels, WaveformStream, WaveformStreamMetadata } from "./Stream";
import { objectMap } from "./Util";

export interface DecoderMetadata extends WaveformStreamMetadata {
    input: StreamChannels<"analog" | "binary">;
}

export type InputSamples<T extends DecoderMetadata> = {
    [ch in keyof T["input"]]: ChannelWaveforms<T["input"]>[ch]["data"][number]
};

/**
 * Interface for all decoders
 * 
 * The decode function is called by the stream when
 * corresponding input waveforms are updated
 */
export abstract class DecoderStream<T extends DecoderMetadata> extends WaveformStream<T> {

    /**
     * Called once when the stream is added to the session
     */
    public start(): void {
        
    }

    /**
     * Validate input and run the decode implementation
     */
    public runDecoder(fromStart: boolean): boolean {
        /* Assert that all input channels are mapped to a valid waveform */
        /** @todo Make sure to invalidate waveforms when deleting them */
        const inputsValid = Object.entries(this.metadata.input).every(([ch, data]) => (
            this.inputs[ch] && this.inputs[ch].waveform
        ));
        if (!inputsValid) {
            return false;
        }

        console.log("Running decoder:", this.metadata.name, "| From start:", fromStart);
        const inputWaveforms = objectMap(this.inputs, (ch, instance) => instance?.waveform) as ChannelWaveforms<T["input"]>;
        this.decode(inputWaveforms, fromStart);

        return true;
    }

    /**
     * Called by the session (UI) to set the input reference for a channel
     */
    public setInput(ch: keyof T["input"], instance: WaveformInstance): void {
        console.assert(ch in this.metadata.input);
        // @ts-expect-error
        console.assert(instance.dataType === this.metadata.input[ch].dataType);

        /* If the input is already mapped, remove this as a listener from it */
        if (this.inputs[ch]) {
            if (this.inputs[ch] === instance)
                return;

            const index = this.inputs[ch].listeners.indexOf(this);
            this.inputs[ch].listeners.splice(index, 1);
        }

        /* Add this as a listener of the waveform and assign it to input */
        instance.listeners.push(this);
        this.inputs[ch] = instance;

        /* Try to run the decoder if all the input are now assigned */
        this.runDecoder(true);
    }

    /**
     * Get input mappings for UI
     */
    public getInputs() {
        return {...this.inputs};
    }

    /**
     * Decoder implementation
     * @param input Maps input channel ids to waveform data
     * @param fromStart Says if the decoder should start the decoding
     * process from the start of the waveforms
     * @note Decoding result is returned through the stream's `onWaveformReady` method
     */
    protected abstract decode(input: ChannelWaveforms<T["input"]>, fromStart: boolean): Promise<void>;

    /**
     * Decoders are all executed locally so there is no need
     * for any extra processing when assigning values to the parameters
     */
    protected onSetParameter(id: keyof T["params"], value: T["params"][keyof T["params"]]["default"]): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Get samples at the specified time point (time rounded down to the nearest sample)
     * @note To be used only if all signals are analog or binary
     * @note Will throw an error if the time is out of bounds for any of the waveforms
     */
    protected getInputAtTime(waveforms: ChannelWaveforms<T["input"]>, time: number): InputSamples<T> {
        // @ts-expect-error
        return objectMap(waveforms, (ch, waveform) => waveform.data[Math.floor(time * waveform.sampleRate)]);
    }

    private inputs: {[ch in keyof T["input"]]?: WaveformInstance} = {};

}
