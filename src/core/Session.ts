import { DecoderWaveformStream, WaveformStream } from "./Stream";
import { objectMap } from "./Util";
import { Waveform, WaveformType } from "./Waveform";

/**
 * Data about a single stream output channel
 */
interface WaveformInstance {
    name:       string;
    dataType:   WaveformType;
    waveform?:  Waveform;
    stream:     WaveformStream;
    listeners:  DecoderWaveformStream[];

    enabled:    boolean; // If false stream will not be able to update the waveform
    append:     boolean; // If true new waveforms from the stream will be appended to the end
}

export class Session {

    /**
     * Add a stream instance to the session
     * 
     * Creates all the waveforms that the stream can produce
     */
    public streamAdd(streamName: string, stream: WaveformStream): void {
        /* Map each stream output channel to a waveform instance */
        const waveformInstances = objectMap(stream.outputType,
            (outputName, outputDataType) => ({
                name:       streamName + " (" + outputName + ")",
                dataType:   outputDataType,
                stream:     stream,
                listeners:  [],
                enabled:    true,
                append:     true
            })
        );

        /* Add all waveforms to the session waveform list */
        this.waveforms.push(...Object.values(waveformInstances));

        /* When data from the stream is ready, assign each waveform to
        the corresponding stream output channel */
        stream.setCallback((data) => {
            for (const [ch, waveform] of Object.entries(data)) {
                this.updateWaveform(waveformInstances[ch], waveform);
            }
        });
    }

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
        /* Data type of the channel and the received waveform should always match */
        console.assert(instance.dataType === data.dataType);

        // If the channel is disabled, cannot update the waveform
        if (!instance.enabled)
            return;

        if (instance.append && instance.waveform) {
            /** @todo Add merge_waveforms function to Waveform.ts and use it here to merge current and new waveforms */
        } else {
            instance.waveform = data;
        }

        /** @todo Call listeners of this channel */
    }

    /**
     * Used as a callback to add the decoder stream as a listener of
     * the selected waveform
     * @note This function is only referenced from `getWaveformsForDecoderInput`
     */
    private decoderStreamSelectInput(stream: DecoderWaveformStream, waveform: WaveformInstance) {
        /** @todo Check if this waveform is not already assigned as the stream input, if it is, return */

        /** @todo Remove from old waveform.listeners */

        waveform.listeners.push(stream);
    }

    private waveforms: WaveformInstance[] = [];
}