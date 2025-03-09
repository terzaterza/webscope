import { Parameter, ParameterMap, ParameterValues } from "../core/Parameter";
import { CircularProgress, InputAdornment, MenuItem, TextField, Tooltip } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useState } from "react";

/**
 * Unified props for all parameter types
 */
interface ParameterProps<T> {
    param:      Extract<Parameter, {type: T}>;
    value:      ParameterProps<T>["param"]["default"];
    onChange:   (value: ParameterProps<T>["value"]) => Promise<void>;
}

/**
 * Component for entering text input
 * @todo Change this and number param component to call props.onChange when leaving focus (onBlur)
 */
function TextParameterComponent(props: ParameterProps<"text">) {
    const [waiting, setWaiting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string>();

    /** @todo Can do manual validation without asking for the `valid` parameter */
    const handleSubmitValue = (value: string, valid?: boolean) => {
        if (!valid) {
            setErrorMsg(`Invalid input (Min length: ${props.param.minLength ?? ""}, Max: ${props.param.maxLength ?? ""})`);
        } else {
            setWaiting(true);
            props.onChange(value)
                .then(() => setErrorMsg(undefined))
                .catch(() => setErrorMsg("Failed setting the parameter value"))
                .finally(() => setWaiting(false));
        }
    };

    return (
        <Tooltip title={props.param.desc}>
            <TextField
                disabled={waiting}
                label={props.param.name}
                defaultValue={props.value}
                error={errorMsg !== undefined}
                helperText={errorMsg}
                slotProps={{htmlInput: {
                    minLength: props.param.minLength,
                    maxLength: props.param.maxLength
                }, input: {
                    endAdornment: waiting && <InputAdornment position="end"><CircularProgress size={"1.5em"} /></InputAdornment>
                }}}
                onBlur={(ev) => handleSubmitValue(ev.target.value, ev.target.checkValidity())}
                fullWidth
            ></TextField>
        </Tooltip>
    )
}

/**
 * Component for entering a numerical value with the given constraints
 */
function NumberParameterComponent(props: ParameterProps<"number">) {
    const [waiting, setWaiting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string>();

    /** @todo Can do manual validation without asking for the `valid` parameter */
    const handleSubmitValue = (value: string, valid?: boolean) => {
        if (!valid) {
            setErrorMsg(`Invalid input (Min: ${props.param.min}, Max: ${props.param.max})`);
        } else {
            setWaiting(true);
            props.onChange(parseFloat(value))
                .then(() => setErrorMsg(undefined))
                .catch(() => setErrorMsg("Failed setting the parameter value"))
                .finally(() => setWaiting(false));
        }
    };

    return (
        <Tooltip title={props.param.desc}>
            <TextField
                type="number"
                disabled={waiting}
                label={props.param.name}
                defaultValue={props.value}
                error={errorMsg !== undefined}
                helperText={errorMsg}
                slotProps={{htmlInput: {
                    min: props.param.min,
                    max: props.param.max,
                    step: props.param.step ?? 1e-12
                }, input: {
                    endAdornment: waiting && <InputAdornment position="end"><CircularProgress size={"1.5em"} /></InputAdornment>
                }}}
                onBlur={(ev) => handleSubmitValue(ev.target.value, ev.target.checkValidity())}
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
                onChange={(ev) => props.onChange(ev.target.checked)}
                fullWidth
            ></TextField>
        </Tooltip>
    );
}

interface ParameterMapProps {
    parameters: ParameterMap;
    values:     ParameterValues<ParameterMap>;
    setValue:   (key: string, value: string | number) => Promise<void>;
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