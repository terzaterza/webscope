import { BarChart, LineChart, ScatterChart } from "@mui/x-charts";
import { Config, Layout } from "plotly.js";
import { memo, useState } from "react";
import Plot from "react-plotly.js";
import { Session, WaveformInstance } from "../core/Session";

const PLOTLY_STYLE: React.CSSProperties = {
    width: "100%",
    height: "25vh"
};

const PLOTLY_LAYOUT: Partial<Layout> = {
    margin: {t: 0, b: 0},
    xaxis: {
        exponentformat: "SI",
        automargin: true,
        matches: "x"
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

interface WaveformInstanceProps {
    waveforms: WaveformInstance[];
    session: Session;
}

function WaveformInstanceComponent(props: WaveformInstanceProps) {
    const [settingsDialog, setSettingsDialog] = useState<HTMLButtonElement>();
    /** @todo Add state hidden for each waveform and don't show the waveform if true to save vertical space */

    const waveformRender = () => {
        if (!props.instance.waveform)
            return (<></>);
        switch (props.instance.waveform.dataType) {
            case "analog": return (<AnalogWaveform {...props.instance.waveform}></AnalogWaveform>)
            case "binary": return (<BinaryWaveform {...props.instance.waveform}></BinaryWaveform>)
            case "frame": return (<FrameWaveform {...props.instance.waveform}></FrameWaveform>)
        }
    };

    return (
        <Grid container size={12}>
            <Grid size={1} alignContent="center">
                <Button variant="contained" onClick={(ev) => setSettingsDialog(ev.currentTarget)}>{props.instance.name}</Button>
                <InstanceSettingsDialog
                    open={settingsDialog !== undefined}
                    instance={props.instance}
                    session={props.session}
                    anchor={settingsDialog}
                    onClose={() => setSettingsDialog(undefined)}
                ></InstanceSettingsDialog>
            </Grid>
            <Grid size="grow">
                {waveformRender()}
            </Grid>
        </Grid>
    );
}