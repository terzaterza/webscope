import { ParameterMap, ParameterValues } from "./Parameter";
import { ChannelWaveforms, StreamChannels, WaveformStream, WaveformStreamMetadata } from "./Stream";
import { Waveform, WaveformFromType, WaveformType } from "./Waveform";

export interface DecoderMetadata extends WaveformStreamMetadata {
    input: StreamChannels;
}

/**
 * Interface for all decoders
 * 
 * The decode function is called by the stream when
 * corresponding input waveforms are updated
 */
export abstract class DecoderStream<T extends DecoderMetadata> extends WaveformStream<T> {
    protected abstract decode: (
        input:  ChannelWaveforms<T["input"]>,
        params: ParameterValues<T["params"]>
    ) => ChannelWaveforms<T["output"]>;
}