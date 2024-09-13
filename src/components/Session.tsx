import { Box, Button, ListSubheader, MenuItem, Modal, Paper, Select, TextField } from "@mui/material";
import React, { useState } from "react";
import { getStreamList, WaveformStream, WaveformStreamMetadata } from "../core/Stream";
import { AnalogWaveform, BinaryWaveform, FrameWaveform } from "./Waveform";
import Grid from "@mui/material/Grid2";
import { Session, WaveformInstance } from "../core/Session";


function WaveformInstanceComponent({instance, key}: {instance: WaveformInstance, key: string | number}) {
    const waveformRender = () => {
        if (!instance.waveform)
            return (<></>);
        switch (instance.waveform.dataType) {
            case "analog": return (<AnalogWaveform {...instance.waveform}></AnalogWaveform>)
            case "binary": return (<BinaryWaveform {...instance.waveform}></BinaryWaveform>)
            case "frame": return (<FrameWaveform {...instance.waveform}></FrameWaveform>)
        }
    };
    return (
        <Grid container key={key} size={12}>
            <Grid size={2}>
                <Button variant="contained">{instance.name}</Button>
            </Grid>
            <Grid size={10}>
                {waveformRender()}
            </Grid>
        </Grid>
    );
}

export function SessionComponent() {
    const [waveforms, setWaveforms] = useState<WaveformInstance[]>([]);
    const [waveformDialog, setWaveformDialog] = useState(false);

    /* Create the underlying session object associated with this component */
    const _ = useState(new Session((instances) => setWaveforms(instances)));

    const centerPositionStyle: React.CSSProperties = {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)"
    };

    return (
        <Grid container spacing={2} padding={1}>
            {/* Can return this container directly or add top ribbon menu */}
            {waveforms.map((v, i) => WaveformInstanceComponent({instance: v, key: i}))}
            <Grid size={2}>
                {/* On click open modal, and on modal.createButton.click addStream */}
                <Button variant="outlined" onClick={() => {setWaveformDialog(true);}}>New waveform</Button>

                <Modal open={waveformDialog} onClose={() => {setWaveformDialog(false);}}>
                    <Paper variant="elevation" style={{...centerPositionStyle, padding: 10}}>
                        <TextField label="Stream name"></TextField>
                        <br></br>
                        <Select label="Stream type">
                            {Object.entries(getStreamList()).map(([category, stream]) => (
                                <>
                                <ListSubheader key={category}>{category}</ListSubheader>
                                {stream.map((v, i) => (
                                    <MenuItem key={category + i}>{v.metadata.name}</MenuItem>
                                ))}
                                </>
                            ))}
                        </Select>
                    </Paper>
                </Modal>

            </Grid>
        </Grid>
    );
}