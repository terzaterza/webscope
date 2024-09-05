import { WaveformStream } from "./Stream";
import { Waveform } from "./Waveform";

/**
 * -------------!!!!!!!!!-------------
 * @todo Session should keep track of streams (instead of waveforms)
 * and the stream output types (waveform types) which allows for setting
 * decoder inputs without waiting for the waveform data to arrive
 * -----------------------------------
 */

interface WaveformInstance {
    name:       string;
    waveform?:  Waveform;
    stream:     WaveformStream;
    // listeners:  DecoderWaveformStream[];

    enabled:    boolean; // If false stream will not be able to update the waveform
    append:     boolean; // If true new waveforms from the stream will be appended to the end
}

type WaveformCollection = { [name: string]: WaveformInstance };


export class Session {

    public waveformAdd(name: string, stream: WaveformStream): void {
        if (name in this.waveforms)
            throw new Error("Waveform with the given name already exists");
        
        this.waveforms[name] = {
            name: name,
            stream: stream,
            enabled: true,
            append: true
        };

        /* @todo Stream could also be instantiated here and the
         * callback could be provided through the constructor */
        stream.setCallback((data: Waveform) => {
            this.waveformUpdate(name, data);
        });
    }

    public waveformSetEnabled(name: string, enabled: boolean) {
        console.assert(name in this.waveforms);

        this.waveforms[name].enabled = enabled;
        /** @todo Re render in ui after setting this */
    }

    public waveformSetAppend(name: string, append: boolean) {
        console.assert(name in this.waveforms);

        this.waveforms[name].append = append;
        /** @todo Re render in ui after setting this */
    }

    /**
     * Called by the waveform stream callback when new data
     * is available
     */
    private waveformUpdate(name: string, data: Waveform): void
    {
        // Can only add waveforms to ids (instances) which exist
        console.assert(name in this.waveforms);
        const instance = this.waveforms[name];
        
        // Assert that the stream which is updating the waveform is
        // the one associated with the waveform instance
        // console.assert(instance.stream === stream);

        // If the instance is disabled, cannot update the waveform
        if (!instance.enabled)
            return;

        if (instance.append && instance.waveform) {
            console.assert(instance.waveform.dataType === data.dataType);
            /** @todo Add merge_waveforms function to Waveform.ts and use it here to merge current and new waveforms */
        } else {
            instance.waveform = data;
        }

        /** @todo Call listeners of this instance */
    }

    private waveforms: WaveformCollection = {};
}