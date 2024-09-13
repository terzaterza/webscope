import { Box, TextField, Select, MenuItem } from "@mui/material";
import { useState } from "react";

export function TextDelimitedStreamDialog() {
    
}

export function StreamDialog() {
    type StreamType = "text" | "decoder" | "serial" | "network";
    const [streamType, setStreamType] = useState<StreamType | undefined>();

    const streamOptions = (streamType?: StreamType) => {
        switch (streamType) {
            case "text":
            default: return <></>
        }
    };
    
    return (
        <Box component="form">
            <TextField label="Name"></TextField>
            <Select onChange={(event) => {setStreamType(event.target.value as StreamType);}}>
                <MenuItem>Text Input</MenuItem>
                <MenuItem>Decoder</MenuItem>
                <MenuItem disabled>Serial Port</MenuItem>
                <MenuItem disabled>Network</MenuItem>
            </Select>
            {streamOptions(streamType)}
        </Box>
    );
}