import { Config, Layout } from "plotly.js";
import { memo } from "react";
import Plot from "react-plotly.js";
import { AnalogWaveform, BinaryWaveform, FrameWaveform } from "../core/Waveform";

const PLOTLY_STYLE: React.CSSProperties = {
    width: "100%",
    height: "25vh"
};

const PLOTLY_LAYOUT: Partial<Layout> = {
    margin: {t: 0, b: 0},
    xaxis: {
        exponentformat: "SI",
        automargin: true
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


interface AnalogWaveformProps {
    waveform: AnalogWaveform;
}

export const AnalogWaveformComponent = memo(function AnalogWaveform(props: AnalogWaveformProps) {
    return (
        <Plot
            data={[{
                y: props.waveform.data,
                // @ts-expect-error - dx property not visible
                dx: 1 / props.waveform.sampleRate,
                mode: "lines"
            }]}
            style={PLOTLY_STYLE}
            layout={PLOTLY_LAYOUT}
            config={PLOTLY_CONFIG}
        />
    );
});


interface BinaryWaveformProps {
    waveform: BinaryWaveform;
}

export const BinaryWaveformComponent = memo(function BinaryWaveform(props: BinaryWaveformProps) {
    return (
        <Plot
            data={[{
                y: props.waveform.data,
                // @ts-expect-error - dx property not visible
                dx: 1 / props.waveform.sampleRate,
                mode: "lines",
                line: {shape: "vh"}
            }]}
            style={PLOTLY_STYLE}
            layout={PLOTLY_LAYOUT}
            config={PLOTLY_CONFIG}
        />
    );
});

interface FrameWaveformProps {
    waveform: FrameWaveform;
}

export const FrameWaveformComponent = memo(function FrameWaveform(props: FrameWaveformProps) {
    return (
        <Plot
            data={[{
                type: "bar",
                y: props.waveform.data.map((frame) => 1),
                x: props.waveform.data.map((frame) => (frame.start + frame.end) / 2),
                width: props.waveform.data.map((frame) => frame.end - frame.start),
                text: props.waveform.data.map((frame) => frame.data as string)
            }]}
            style={PLOTLY_STYLE}
            layout={PLOTLY_LAYOUT}
            config={PLOTLY_CONFIG}
        />
    );
});
