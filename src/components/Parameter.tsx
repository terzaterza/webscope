import { Parameter, ParameterMap, ParameterValues } from "../core/Parameter";
import { Box, Checkbox, MenuItem, Select, Slider, TextField, Tooltip, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { numberSIFormat, objectMap } from "../core/Util";
import { useState } from "react";

/**
 * Unified props for all parameter types
 */
interface ParameterProps<T> {
    param:      Extract<Parameter, {type: T}>;
    value:      ParameterProps<T>["param"]["default"];
    onChange:   (value: ParameterProps<T>["value"]) => void;
}

/**
 * Component for entering text input
 */
function TextParameterComponent(props: ParameterProps<"text">) {
    return (
        <Tooltip title={props.param.desc}>
            <TextField
                label={props.param.name}
                value={props.value}
                slotProps={{htmlInput: {
                    minLength: props.param.minLength,
                    maxLength: props.param.maxLength
                }}}
                onChange={(ev) => {
                    if (ev.target.checkValidity())
                        props.onChange(ev.target.value);
                }}
                fullWidth
            ></TextField>
        </Tooltip>
    )
}

/**
 * Component for entering a numerical value with the given constraints
 */
function NumberParameterComponent(props: ParameterProps<"number">) {    
    return (
        <Tooltip title={props.param.desc}>
            <TextField
                type="number"
                label={props.param.name}
                value={props.value}
                slotProps={{htmlInput: {
                    min: props.param.min,
                    max: props.param.max,
                    step: props.param.step
                }}}
                onChange={(ev) => {
                    if (ev.target.checkValidity())
                        props.onChange(Number(ev.target.value));
                }}
                fullWidth
            ></TextField>
        </Tooltip>
    );
}

/**
 * Component for selecting a value from a dropdown list
 */
function SelectParameterComponent(props: ParameterProps<"select">) {
    return (
        <Tooltip title={props.param.desc}>
            <TextField
                select
                label={props.param.name}
                value={props.value}
                onChange={(ev) => {props.onChange(ev.target.value)}}
                fullWidth
            >
                {props.param.options.map((v, i) => (
                    <MenuItem key={i} value={v}>{v}</MenuItem>
                ))}
            </TextField>
        </Tooltip>
    );
}

/**
 * Component for selecting a boolean value
 */
function OptionParameterComponent(props: ParameterProps<"option">) {
    return (
        <Tooltip title={props.param.desc}>
            <TextField
                type="checkbox"
                label={props.param.name}
                value={props.value}
                // @ts-expect-error
                onChange={(ev) => props.onSelect(ev.target.checked)}
                fullWidth
            ></TextField>
        </Tooltip>
    );
}

interface ParameterMapProps {
    parameters: ParameterMap;
    values:     ParameterValues<ParameterMap>; /** @todo Can make this interface <T extends ParameterMap> */
    setValue:   (key: string, value: string | number) => void; /** @todo Can make key and value: keyof T and T[keyof T] */
}

/**
 * 
 */
export function ParameterMapComponent(props: ParameterMapProps) {
    const parameterRender = (id: string, p: Parameter) => {
        const onChange = (value: typeof p.default) => props.setValue(id, value);

        switch (p.type) {
            case "text":    return <TextParameterComponent   param={p} value={props.values[id]} onChange={onChange} ></TextParameterComponent>
            case "number":  return <NumberParameterComponent param={p} value={props.values[id]} onChange={onChange} ></NumberParameterComponent>
            case "select":  return <SelectParameterComponent param={p} value={props.values[id]} onChange={onChange} ></SelectParameterComponent>
            case "option":  return <OptionParameterComponent param={p} value={props.values[id]} onChange={onChange} ></OptionParameterComponent>
        }
    };

    return (
        <Grid container spacing={1}>
            {Object.entries(props.parameters).map(([id, param]) => (
                <Grid size={12} key={id}>
                    {parameterRender(id, param)}
                </Grid>
            ))}
        </Grid>
    );
}