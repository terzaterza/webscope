import { ParameterMap, ParameterValues } from "../../core/Parameter";
import { registerStream, WaveformStream, WaveformStreamMetadata } from "../../core/Stream";

/**
 * Parameters for configuring the stream
 * @todo Add waveform length as a parameter, currently fixed as `WAVEFORM_LENGTH`
 */
const sineStreamParameters = {
    "amp": {
        name: "Amplitude",
        type: "number",
        min: 0,
        max: 1000,
        default: 1
    },
    "f": {
        name: "Frequency",
        type: "number",
        min: 0,
        max: 1e10,
        default: 1e3
    },
    "phase": {
        name: "Phase",
        type: "number",
        min: 0,
        max: 2 * Math.PI,
        default: 0
    },
    "fs": {
        name: "Sample rate",
        type: "number",
        min: 1,
        max: 1e10,
        step: 1,
        default: 1e4
    }
} satisfies ParameterMap;


/**
 * Stream description metadata
 */
const sineStreamMetadata = {
    name: "Sine",
    params: sineStreamParameters,
    output: {"data": {name: "Sine", dataType: "analog"}}
} satisfies WaveformStreamMetadata;


/**
 * Period of simulated waveform generation in milliseconds
 */
const WAVEFORM_GENERATION_DELAY_MS: number = 1000;

/**
 * Length of the waveform segment generated on each timer trigger
 */
const WAVEFORM_LENGTH: number = 1024;


/**
 * An example stream which generates a sine waveform with a
 * parameter specified phase and frequency every second
 * @note `sineStreamMetadata` is used as generic type for the stream class
 */
class SineStream extends WaveformStream<typeof sineStreamMetadata> {

    constructor(initialParameters: ParameterValues<typeof sineStreamParameters>) {
        super(sineStreamMetadata, initialParameters);
    }

    public start(): void {
        /* Generate a waveform */
        this.generateWaveform();

        /* Set a timer to generate data every second */
        setInterval(() => {this.generateWaveform();}, WAVEFORM_GENERATION_DELAY_MS);
    }

    protected onSetParameter(id: "fs" | "amp" | "f" | "phase", value: number): Promise<void> {
        /** @todo Can call generateWaveform() here to be more responsive */

        /* No communication with any devices so just return true */
        return Promise.resolve();
    }

    private generateWaveform() {
        const parameters = this.getParameterValues();
        
        const sampleRate = parameters["fs"];
        const amplitude = parameters["amp"];
        const angRate = 2 * Math.PI * parameters["f"];
        const phase = parameters["phase"];

        const timeSamples = Array(WAVEFORM_LENGTH).fill(0).map((v, i) =>
            (this.sampleOffset + i) / sampleRate
        );
        
        const waveform = timeSamples.map((t) =>
            Math.sin(t * angRate + phase) * amplitude
        );
    
        this.sampleOffset += timeSamples.length;
        this.onWaveformReady({"data": {
            data: waveform, dataType: "analog", sampleRate: sampleRate
        }})
    }

    private sampleOffset: number = 0;
}

registerStream("Simulated", sineStreamMetadata, SineStream);

/** @todo This file has to be imported to ./src/streams/index.ts for now */
