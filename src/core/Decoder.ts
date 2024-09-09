import { ParameterList, ParameterMap, ParameterValues } from "./Parameter";
import { Waveform, WaveformFromType, WaveformType } from "./Waveform";

/**
 * Information about decoder input and output channels
 */
interface DecoderChannelData {
    name:       string;
    desc?:      string;
    dataType:   WaveformType;
}

/**
 * Information about the decoder
 * 
 * Used to display info during runtime when selecting
 * a decoder during stream creation
 * 
 * @note This interface is used only as the Readonly version
 */
interface DecoderMetadataMutable {
    name:       string;
    desc?:      string;
    input:      {[ch: string]: DecoderChannelData};
    output:     {[ch: string]: DecoderChannelData};
    params:     ParameterMap;
    streaming:  boolean; // if true supports streaming
}

export type DecoderMetadata = Readonly<DecoderMetadataMutable>;


type ChannelWaveforms<T extends {[ch: string]: DecoderChannelData}> =
    {[ch in keyof T]: WaveformFromType<T[ch]["dataType"]>};

/**
 * Interface for all decoders
 * 
 * The decode function is called by the stream when
 * corresponding input waveforms are updated
 */
export interface Decoder<T extends DecoderMetadata> {
    readonly metadata: T;

    decode: (
        input:  ChannelWaveforms<T["input"]>,
        params: ParameterValues<T["params"]>
    ) => ChannelWaveforms<T["output"]>;
}