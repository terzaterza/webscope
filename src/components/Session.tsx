import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, ListSubheader, MenuItem, Modal, Paper, Popover, Select, TextField, Typography } from "@mui/material";
import React, { useState } from "react";
import { getStreamList, StreamDatabaseItem } from "../core/Stream";
import { AnalogWaveform, BinaryWaveform, FrameWaveform } from "./Waveform";
import Grid from "@mui/material/Grid2";
import { Session, WaveformInstance } from "../core/Session";
import { ParameterMapComponent } from "./Parameter";
import { ParameterValues } from "../core/Parameter";
import { objectMap } from "../core/Util";


interface InstanceSettingsDialogProps {
    open:       boolean;
    instance:   WaveformInstance;
    anchor?:    HTMLElement;
    onClose:    () => void;
}

function InstanceSettingsDialog(props: InstanceSettingsDialogProps) {
    const [paramValues, setParamValues] = useState(props.instance.stream.getParameterValues());

    const handleSetParameter = (k: string, v: any) => {
        /** @todo Set the loading icon here and remove on promise resolve or fail */
        props.instance.stream.trySetParameter(k, v).then(() => {
            const newParamValues = {...paramValues};
            newParamValues[k] = v;
            setParamValues(newParamValues);
        }).catch(() => {
            console.warn("UI parameter error caught");
            /** @todo Set input element to show error through props */
        });
    };

    /** @todo If stream is of decoder type use this */
    const renderInputChannelOptions = () => {
        
    };

    return (
        <Popover open={props.open} onClose={props.onClose} anchorEl={props.anchor}>
            <DialogTitle>{props.instance.name /* Add icon here (also to the button) to signal data type */}</DialogTitle>
            <DialogContent style={{paddingTop: 10}}>
                <ParameterMapComponent
                    parameters={props.instance.stream.metadata.params}
                    values={paramValues}
                    setValue={handleSetParameter}
                ></ParameterMapComponent>
            </DialogContent>
        </Popover>
    );
}

interface WaveformInstanceProps {
    instance: WaveformInstance;
}

function WaveformInstanceComponent(props: WaveformInstanceProps) {
    const [settingsDialog, setSettingsDialog] = useState<HTMLButtonElement>();

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

            {waveforms.map((v, i) => (
                <WaveformInstanceComponent
                    key={i}
                    instance={v}
                ></WaveformInstanceComponent>
            ))}
            
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