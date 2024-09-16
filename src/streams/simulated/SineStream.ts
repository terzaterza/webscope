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
        max: 500,
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
        step: 0.01,
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
    output: {"Sin": "analog"}
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
    
    constructor(parameters: ParameterValues<typeof sineStreamParameters>) {
        super(sineStreamMetadata, parameters);

        setInterval(() => {this.generateWaveform();}, WAVEFORM_GENERATION_DELAY_MS);
    }

    private generateWaveform() {
        const sampleRate = this.getParameter("fs");
        const amplitude = this.getParameter("amp");
        const angRate = 2 * Math.PI * this.getParameter("f");
        const phase = this.getParameter("phase");

        const timeSamples = Array(WAVEFORM_LENGTH).fill(0).map((v, i) =>
            (this.sampleOffset + i) / sampleRate
        );
        
        const waveform = timeSamples.map((t) =>
            Math.sin(t * angRate + phase) * amplitude
        );
    
        this.sampleOffset += timeSamples.length;
        this.onWaveformReady({"Sin": {
            data: waveform, dataType: "analog", sampleRate: sampleRate
        }})
    }

    private sampleOffset: number = 0;
}

registerStream("Simulated", sineStreamMetadata, SineStream);

/** @todo This file has to be imported to ./src/streams/index.ts for now */
