import { WaveformStream, WaveformStreamMetadata } from "./Stream";
import { Waveform, WaveformType } from "./Waveform";

/**
 * Data about a single stream output channel
 */
export interface WaveformInstance {
    name:       string;
    dataType:   WaveformType;
    waveform?:  Waveform;
    stream:     WaveformStream<any>;
    listeners:  DecoderInstance[];

    enabled:    boolean; // If false stream will not be able to update the waveform
    append:     boolean; // If true new waveforms from the stream will be appended to the end
}

/**
 * Data about a decoder stream instance to track
 * input waveform dependencies
 */
interface DecoderInstance {
    decoder: any; /** @todo Replace with DecoderWaveformStream */
    inputs: {[ch: string]: WaveformInstance | undefined};
}

/**
 * Session is the object which tracks the state of a
 * collection of waveforms and streams
 */
export class Session {

    /**
     * Session requires a render callback function to signal to the UI
     * when has the waveform data changed and needs to be rerendered
     */
    constructor(
        private readonly renderCallback: (waveforms: WaveformInstance[]) => void
    ) {}

    /** @todo Add save and load to be able to store sessions as a file (or cookie) */

    /**
     * Add a stream instance to the session
     * 
     * Creates all the waveforms that the stream can produce
     */
    public addStream(streamName: string, stream: WaveformStream<WaveformStreamMetadata>): void {
        /* For each output of the stream create a waveform instance */
        for (const [outputName, outputType] of Object.entries(stream.metadata.output)) {
            const instance: WaveformInstance = {
                name:       streamName + " (" + outputName + ")",
                dataType:   outputType,
                stream:     stream,
                listeners:  [],
                enabled:    true,
                append:     true
            };

            /* Add this instance to the list of current session waveforms */
            this.waveforms.push(instance);

            /* Set the callback for when the streams generates new data */
            stream.setCallback(outputName, (data: Waveform) => {
                this.updateWaveform(instance, data);
            });
        }

        /* Rerender waveforms */
        this.renderCallback([...this.waveforms]);
    };

    /**
     * Returns instances of all waveforms that match
     * the given data type
     * 
     * Used to get compatible input waveforms for decoders
     * 
     * @todo Finish this and the decoder stream input select mechanism
     */
    public getWaveformsOfType(type: WaveformType) {
        return this.waveforms
            .filter((v) => v.dataType === type)
            .map((v) => ({
                name: v.name
            }));
    }

    /**
     * Called by the waveform stream callback when new data
     * is available
     */
    private updateWaveform(instance: WaveformInstance, data: Waveform): void {
        /* If the channel is disabled, can't update the waveform */
        if (!instance.enabled)
            return;

        /* If the update sequence was not already started, we are the first */
        const firstInSequence = !this.updateSequenceStarted;
        /* It's okay to set to true even if already was true */
        this.updateSequenceStarted = true;

        /* If we want to append this data and there is already some data, do a merge */
        if (instance.append && instance.waveform) {
            /** @todo Add mergeWaveforms function to Waveform.ts and use it here to merge current and new waveforms */
        } else {
            instance.waveform = data;
        }

        /** @todo Call listeners */

        /* Trigger rerendering if this was the first update in the sequence */
        if (firstInSequence) {
            this.updateSequenceStarted = false;
            this.renderCallback([...this.waveforms]);
        }
    };

    private waveforms: WaveformInstance[] = [];
    private updateSequenceStarted: boolean = false; /* Used by updateWaveform to track when to rerender the data */
}