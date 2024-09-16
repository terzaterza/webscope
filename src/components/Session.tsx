import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, ListSubheader, MenuItem, Modal, Paper, Select, TextField, Typography } from "@mui/material";
import React, { useState } from "react";
import { getStreamList, StreamDatabaseItem, WaveformStream, WaveformStreamMetadata } from "../core/Stream";
import { AnalogWaveform, BinaryWaveform, FrameWaveform } from "./Waveform";
import Grid from "@mui/material/Grid2";
import { Session, WaveformInstance } from "../core/Session";
import { ParameterMapComponent } from "./Parameter";
import { ParameterMap, ParameterValues } from "../core/Parameter";
import { objectMap } from "../core/Util";


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
            <Grid size={1} alignContent="center">
                <Button variant="contained">{instance.name}</Button>
                {/** @todo On click of this button can open menu (or popover) to change settings of the stream (and waveform) */}
            </Grid>
            <Grid size="grow">
                {waveformRender()}
            </Grid>
        </Grid>
    );
}


interface CreateStreamDialogProps {
    open:       boolean;
    onClose:    () => void;
    onSubmit:   (name: string, stream: StreamDatabaseItem, params: ParameterValues) => void;
}

function CreateStreamDialog(props: CreateStreamDialogProps) {
    const [streamName, setStreamName] = useState("");
    const [selectedStream, setSelectedStream] = useState<
        StreamDatabaseItem & { paramValues: ParameterValues }
    >();
    
    const handleSetParameter = (key: string, value: string | number) => {
        if (!selectedStream)
            throw new Error("Parameter set without selected stream");

        const newParams: ParameterValues = {...selectedStream.paramValues};
        newParams[key] = value;
        setSelectedStream({...selectedStream, paramValues: newParams});
    };

    const handleSubmit = () => {
        if (streamName && selectedStream)
            props.onSubmit(streamName, selectedStream, selectedStream.paramValues);
    };

    return (
        // Check if width can be fixed when adding Grid to this dialog without using fullWidth in Dialog
        <Dialog open={props.open} onClose={props.onClose} fullWidth maxWidth="xs">
            <DialogTitle>Add a new stream</DialogTitle>
            <DialogContent>
                <TextField
                    label="Stream name"
                    margin="dense"
                    value={streamName}
                    onChange={(ev) => setStreamName(ev.target.value)}
                    fullWidth
                ></TextField>
                <TextField select label="Select stream" fullWidth margin="dense" value={selectedStream ? selectedStream.metadata.name : ""}>
                    {Object.entries(getStreamList()).map(([category, stream]) => [
                        <ListSubheader>{category}</ListSubheader>,
                        ...stream.map((v) => (
                            <MenuItem
                                onClick={() => setSelectedStream({
                                    ...v,
                                    paramValues: objectMap(v.metadata.params, (id, p) => p.default)
                                })}
                                value={v.metadata.name}
                            >{v.metadata.name}</MenuItem>
                        ))
                    ])}
                </TextField>
                <DialogContentText marginTop={2} marginBottom={1}>Options</DialogContentText>
                {selectedStream ? (
                    <ParameterMapComponent
                        parameters={selectedStream.metadata.params}
                        values={selectedStream.paramValues}
                        setValue={handleSetParameter}
                    ></ParameterMapComponent>
                ) : undefined}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleSubmit}>Add</Button>
                <Button onClick={props.onClose}>Cancel</Button>
            </DialogActions>
        </Dialog>
    );
}


export function SessionComponent() {
    const [waveforms, setWaveforms] = useState<WaveformInstance[]>([]);
    const [streamDialog, setStreamDialog] = useState(false);

    /* Create the underlying session object associated with this component */
    const session = useState(new Session((instances) => setWaveforms(instances)))[0];

    const handleCreateStream = (name: string, stream: StreamDatabaseItem, params: ParameterValues) => {
        setStreamDialog(false);
        const instance = new stream.stream(params);
        session.addStream(name, instance);
    };

    return (
        <Grid container spacing={1} padding={1}>
            {/* Can return this container directly or add top ribbon menu */}
            {waveforms.map((v, i) => WaveformInstanceComponent({instance: v, key: i}))}
            
            <CreateStreamDialog
                open={streamDialog}
                onClose={() => setStreamDialog(false)}
                onSubmit={handleCreateStream}
            ></CreateStreamDialog>

            <Grid size={1}>
                <Button variant="outlined" onClick={() => {setStreamDialog(true);}}>New waveform</Button>
            </Grid>
        </Grid>
    );
}