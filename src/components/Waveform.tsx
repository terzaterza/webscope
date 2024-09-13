import { BarChart, LineChart, ScatterChart } from "@mui/x-charts";
import { memo } from "react";

const WAVEFORM_HEIGHT = 220;

export interface AnalogWaveformProps {
    data: number[];
    sampleRate: number;
}

export const AnalogWaveform = memo(function AnalogWaveform(props: AnalogWaveformProps) {
    return (
        <LineChart
        skipAnimation
        series={[{curve: "linear", data: props.data, showMark: false}]}
        xAxis={[{data: props.data.map((v, i) => i / props.sampleRate)}]}
        height={WAVEFORM_HEIGHT}
        ></LineChart>
    );
});


export interface BinaryWaveformProps {
    data: (0 | 1)[];
    sampleRate: number;
}

export const BinaryWaveform = memo(function BinaryWaveform(props: BinaryWaveformProps) {
    return (
        <LineChart
        skipAnimation
        series={[{curve: "stepAfter", data: props.data, showMark: false}]}
        xAxis={[{data: props.data.map((v, i) => i / props.sampleRate)}]}
        yAxis={[{min: -0.1, max: 1.1}]}
        height={WAVEFORM_HEIGHT}
        ></LineChart>
    );
});


export interface Frame {
    data: string | number;
    start: number;
    end: number;
}

export interface FrameWaveformProps {
    data: Frame[];
}

export const FrameWaveform = memo(function FrameWaveform(props: FrameWaveformProps) {
    const interval = [props.data[0].start, props.data[props.data.length-1].end];
    return (
        <LineChart
        series={[{curve: "stepAfter", area: true, showMark: false, data: props.data.map((v) => [1, 0]).flat()}]}
        xAxis={[{data: props.data.map((v) => [v.start, v.end]).flat()}]}
        height={WAVEFORM_HEIGHT}
        ></LineChart>
    );
});