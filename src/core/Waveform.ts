
export interface AnalogWaveform {
    data:       number[]; /** @todo Change to typed array of floats */
    dataType:   "analog";
    sampleRate: number;
    offset?:    number;
}

export interface BinaryWaveform {
    data:       (0 | 1)[]; /** @todo Change to custom bit vector class */
    dataType:   "binary";
    sampleRate: number;
    offset?:    number;
}

export interface Frame {
    data:   string;
    start:  number;
    end:   number;
}

export interface FrameWaveform {
    data:       Frame[];
    dataType:   "frame";
}

export type Waveform = AnalogWaveform | BinaryWaveform | FrameWaveform;
export type WaveformType = Waveform["dataType"];
export type WaveformFromType<T extends WaveformType> = Extract<Waveform, {dataType: T}>;

/** @todo Add saveWaveform and loadWaveform functions to be used by Session or independently */