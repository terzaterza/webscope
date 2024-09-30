import { ParameterMap, ParameterValues } from "../../core/Parameter";
import { registerStream, WaveformStream, WaveformStreamMetadata } from "../../core/Stream";
import { BinaryWaveform } from "../../core/Waveform";

const streamParameters = {
    "data": {
        type: "text",
        name: "Binary data",
        desc: "Sequence of zeros and ones without whitespace",
        default: "01010101"
    },
    "period": {
        type: "number",
        name: "Time between to samples",
        min: 1e-12,
        max: 1e3,
        default: 1
    }
} satisfies ParameterMap;

const streamMetadata = {
    name: "Binary from text",
    params: streamParameters,
    output: { "data": "binary" }
} satisfies WaveformStreamMetadata;


class BinaryTextStream extends WaveformStream<typeof streamMetadata> {
    
    constructor(initialParameters: ParameterValues<typeof streamParameters>) {
        super(streamMetadata, initialParameters);
    }

    public start(): void {
        const {data, period} = this.getParameterValues();

        /** @todo Can set bit to random if the character is not 0 or 1 */
        const binaryData = this.parseStringInput(data);

        this.onWaveformReady({data: {data: binaryData, dataType: "binary", sampleRate: 1 / period}});
    }

    protected onSetParameter(id: "data" | "period", value: string | number): Promise<void> {
        if (id === "data") {
            const waveform: BinaryWaveform = {
                dataType: "binary",
                data: this.parseStringInput(value as string),
                sampleRate: 1 / this.getParameterValues()["period"]
            };
            this.onWaveformReady({"data": waveform});
        }
        return Promise.resolve();
    }

    private parseStringInput(data: string): BinaryWaveform["data"] {
        return data.split("").filter((c) => c !== ' ').map((c) => c === "1" ? 1 : 0);
    }

}

registerStream("Simulated", streamMetadata, BinaryTextStream);