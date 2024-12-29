import React from "react";
import { AnalogWaveform, BinaryWaveform, FrameWaveform, Frame } from "../../components/Waveform";

export function AnalogWaveformTest()
{
    const analogWaveformData =
        [...Array(512).keys()].map((v, i) => Math.sin(i / 50));

    return (
        <AnalogWaveform
        data={analogWaveformData}
        sampleRate={1e4}
        ></AnalogWaveform>
    );
}

export function BinaryWaveformTest()
{
    const binaryWaveformData =
        [...Array(512).keys()].map((v, i) => Math.round(Math.sin(i / 50) * 0.5 + 0.5) as (0 | 1));

    return (
        <BinaryWaveform
        data={binaryWaveformData}
        sampleRate={1e4}
        ></BinaryWaveform>
    );
}

export function FrameWaveformTest()
{
    const frameWaveformData: Frame[] = [
        {data: "START", start: 0, end: 2},
        {data: "0x28", start: 5, end: 6},
        {data: "END", start: 9, end: 12}
    ];
    return (
        <FrameWaveform
        data={frameWaveformData}
        ></FrameWaveform>
    );
}