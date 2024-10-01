import { BarChart, LineChart, ScatterChart } from "@mui/x-charts";
import { Config, Layout } from "plotly.js";
import { memo } from "react";
import Plot from "react-plotly.js";

const PLOTLY_STYLE: React.CSSProperties = {
    width: "100%",
    height: "25vh"
};

const PLOTLY_LAYOUT: Partial<Layout> = {
    margin: {t: 0, b: 0},
    xaxis: {
        exponentformat: "SI",
        automargin: true,
        matches: "x2"
    },
    yaxis: {
        automargin: true,
        fixedrange: true
    },
    dragmode: "pan"
};

const PLOTLY_CONFIG: Partial<Config> = {
    displayModeBar: false,
    responsive: true,
    scrollZoom: true
};


export interface AnalogWaveformProps {
    data: number[];
    sampleRate: number;
}

export const AnalogWaveform = memo(function AnalogWaveform(props: AnalogWaveformProps) {
    return (
        <Plot
            data={[{
                y: props.data,
                // @ts-expect-error - dx property not visible
                dx: 1 / props.sampleRate,
                mode: "lines"
            }]}
            style={PLOTLY_STYLE}
            layout={PLOTLY_LAYOUT}
            config={PLOTLY_CONFIG}
        />
    );
});


export interface BinaryWaveformProps {
    data: (0 | 1)[];
    sampleRate: number;
}

export const BinaryWaveform = memo(function BinaryWaveform(props: BinaryWaveformProps) {
    return (
        <Plot
            data={[{
                y: props.data,
                // @ts-expect-error - dx property not visible
                dx: 1 / props.sampleRate,
                mode: "lines",
                line: {shape: "vh"}
            }]}
            style={PLOTLY_STYLE}
            layout={PLOTLY_LAYOUT}
            config={PLOTLY_CONFIG}
        />
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
    return (
        <Plot
            data={[{
                type: "bar",
                y: props.data.map((frame) => 1),
                x: props.data.map((frame) => (frame.start + frame.end) / 2),
                width: props.data.map((frame) => frame.end - frame.start),
                text: props.data.map((frame) => frame.data as string)
            }]}
            style={PLOTLY_STYLE}
            layout={PLOTLY_LAYOUT}
            config={PLOTLY_CONFIG}
        />
    );
});