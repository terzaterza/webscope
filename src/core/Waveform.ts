
export interface AnalogWaveform {
    // data:       Int16Array;
    // scale:      number; // Scale max int16
    data:       number[];
    dataType:   "analog";
    sampleRate: number;
}

export interface BinaryWaveform {
    // data:       Uint8Array;
    data:       (0 | 1)[];
    dataType:   "binary";
    sampleRate: number;
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