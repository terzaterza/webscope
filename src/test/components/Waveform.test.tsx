import React from "react";
import { AnalogWaveformComponent, BinaryWaveformComponent, FrameWaveformComponent } from "../../components/Waveform";
import { Frame } from "../../core/Waveform";

export function AnalogWaveformTest()
{
    const analogWaveformData =
        [...Array(512).keys()].map((v, i) => Math.sin(i / 50));

    return (
        <AnalogWaveformComponent
        waveform={{
            data: analogWaveformData,
            dataType: "analog",
            sampleRate: 1e4
        }}
        ></AnalogWaveformComponent>
    );
}

export function BinaryWaveformTest()
{
    const binaryWaveformData =
        [...Array(512).keys()].map((v, i) => Math.round(Math.sin(i / 50) * 0.5 + 0.5) as (0 | 1));

    return (
        <BinaryWaveformComponent
        waveform={{
            data: binaryWaveformData,
            dataType: "binary",
            sampleRate: 1e4
        }}
        ></BinaryWaveformComponent>
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
        <FrameWaveformComponent
        waveform={{
            data: frameWaveformData,
            dataType: "frame"
        }}
        ></FrameWaveformComponent>
    );
}