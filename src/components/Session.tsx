import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, ListSubheader, MenuItem, Modal, Paper, Popover, Select, TextField, Tooltip, Typography } from "@mui/material";
import React, { useState } from "react";
import { getStreamList, StreamDatabaseItem } from "../core/Stream";
import Grid from "@mui/material/Grid2";
import { Session, WaveformInstance } from "../core/Session";
import { ParameterMapComponent } from "./Parameter";
import { ParameterValues } from "../core/Parameter";
import { objectMap } from "../core/Util";
import { DecoderMetadata, DecoderStream } from "../core/Decoder";
import { AnalogWaveformComponent, BinaryWaveformComponent, FrameWaveformComponent } from "./Waveform";


interface DecoderInputSelectProps {
    stream:     DecoderStream<DecoderMetadata>;
    session:    Session;
}

function DecoderInputSelect(props: DecoderInputSelectProps) {
    const inputMap = props.stream.getInputs();
    return (
        <Grid container size={12} spacing={1}>
            {Object.entries(props.stream.metadata.input).map(([id, channelData]) => (
                <Grid size={12} key={id}>
                    <Tooltip title={channelData.desc}>
                        <TextField select label={channelData.name} defaultValue={inputMap[id]?.name ?? ""} fullWidth>
                            {props.session.getWaveformsOfType(channelData.dataType).map((v, i) => (
                                <MenuItem
                                    key={i}
                                    value={v.name}
                                    onClick={(ev) => {props.stream.setInput(id, v)}}
                                >{v.name}</MenuItem>
                            ))}
                        </TextField>
                    </Tooltip>
                </Grid>
            ))}
        </Grid>
    );
}

interface InstanceSettingsDialogProps {
    open:       boolean;
    instance:   WaveformInstance;
    session:    Session; /* Used by decoder input select */
    anchor?:    HTMLElement;
    onClose:    () => void;
}

function InstanceSettingsDialog(props: InstanceSettingsDialogProps) {
    const [paramValues, setParamValues] = useState(props.instance.stream.getParameterValues());

    const handleSetParameter = (k: string, v: any) => {
        const promise = props.instance.stream.trySetParameter(k, v);

        promise.then(() => {
            const newParamValues = {...paramValues};
            newParamValues[k] = v;
            setParamValues(newParamValues);
        }).catch(() => {
            console.warn("UI parameter error caught");
        });

        return promise;
    };

    /** @todo Fix sizing of the popover */
    return (
        <Popover open={props.open} onClose={props.onClose} anchorEl={props.anchor}>
            <Box width={400}>
                <DialogTitle>{props.instance.name /* Add icon here (also to the button) to signal data type */}</DialogTitle>
                <DialogContent style={{paddingTop: 10}}>
                    {props.instance.stream instanceof DecoderStream &&
                        <DecoderInputSelect
                            stream={props.instance.stream}
                            session={props.session}
                        ></DecoderInputSelect>
                    }
                    <Box height={20}>{/* Used for margin between elements */}</Box>
                    <ParameterMapComponent
                        parameters={props.instance.stream.metadata.params}
                        values={paramValues}
                        setValue={handleSetParameter}
                    ></ParameterMapComponent>
                </DialogContent>
            </Box>
        </Popover>
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
        
        return Promise.resolve();
    };

    const handleSubmit = () => {
        if (streamName && selectedStream)
            props.onSubmit(streamName, selectedStream, selectedStream.paramValues);
        setStreamName("");
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

interface WaveformInstanceProps {
    instance: WaveformInstance;
    session: Session;
}

function WaveformInstanceComponent(props: WaveformInstanceProps) {
    const [settingsDialog, setSettingsDialog] = useState<HTMLButtonElement>();
    /** @todo Add state hidden for each waveform and don't show the waveform if true to save vertical space */

    const waveformRender = () => {
        if (!props.instance.waveform)
            return (<></>);
        switch (props.instance.waveform.dataType) {
            case "analog": return (<AnalogWaveformComponent waveform={{...props.instance.waveform}}></AnalogWaveformComponent>)
            case "binary": return (<BinaryWaveformComponent waveform={{...props.instance.waveform}}></BinaryWaveformComponent>)
            case "frame": return (<FrameWaveformComponent waveform={{...props.instance.waveform}}></FrameWaveformComponent>)
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

export function SessionComponent() {
    const [waveforms, setWaveforms] = useState<WaveformInstance[]>([]);
    const [streamDialog, setStreamDialog] = useState(false);

    /* Create the underlying session object associated with this component */
    const session = useState(new Session((instances) => setWaveforms(instances)))[0];

    const handleCreateStream = (name: string, stream: StreamDatabaseItem, params: ParameterValues) => {
        setStreamDialog(false);
        const instance = new stream.stream(params);
        /** @todo Move stream instantiation to the session addStream */
        session.addStream(name, instance);
    };

    return (
        <Grid container spacing={1} padding={1}>
            {/* Can return this container directly or add top ribbon menu */}

            {waveforms.map((v, i) => (
                <WaveformInstanceComponent
                    key={i}
                    instance={v}
                    session={session}
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