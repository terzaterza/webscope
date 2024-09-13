import { NumberParameter, OptionParameter, ParameterMetadata, SelectParameter, ParameterList } from "../core/Parameter";
import { Box, Checkbox, MenuItem, Select, Slider, Tooltip, Typography } from "@mui/material";

interface NumberParameterProps {
    param: NumberParameter & Partial<ParameterMetadata>;
}

export function NumberParameterComponent(props: NumberParameterProps) {
    const nonRoundedDefault = props.param.default ?? props.param.min;
    const defaultValue = props.param.step ?
        (Math.ceil(nonRoundedDefault / props.param.step) * props.param.step) : 
        nonRoundedDefault;
    return (
        <>
            <Tooltip title={props.param.description}>
                <Typography>{props.param.name}</Typography>
            </Tooltip>
            <Slider
            min={props.param.min}
            max={props.param.max}
            step={props.param.step}
            defaultValue={defaultValue}
            ></Slider>
        </>
    );
}


interface SelectParameterProps {
    param: SelectParameter<any> & Partial<ParameterMetadata>;
}

export function SelectParameterComponent(props: SelectParameterProps) {
    return (
        <Tooltip title={props.param.description}>
            <Select label={props.param.name}>
                {props.param.options.map((v, i) => (
                    <MenuItem key={i} selected={v === props.param.default}>{v}</MenuItem>
                ))}
            </Select>
        </Tooltip>
    );
}

interface OptionParameterProps {
    param: OptionParameter & Partial<ParameterMetadata>;
}

export function OptionParameterComponent(props: OptionParameterProps) {
    
    return (
        <>
        <Tooltip title={props.param.description}>
            <Typography>{props.param.name}</Typography>
        </Tooltip>
        <Checkbox defaultChecked={props.param.checked}></Checkbox>
        </>
    );
}


interface ParameterListProps {
    parameters: ParameterList;
}

export function ParameterListComponent(props: ParameterListProps) {
    const paramRender = (p: ParameterList[number]) => {
        switch (p.type) {
            case "number": return <NumberParameterComponent param={p}></NumberParameterComponent>
            case "select": return <SelectParameterComponent param={p}></SelectParameterComponent>
            case "option": return <OptionParameterComponent param={p}></OptionParameterComponent>
        }
    };

    return (
        <Box>
            {props.parameters.map((p, i) => (
                <Box key={i}>
                    {paramRender(p)}
                    <br></br>
                </Box>
            ))}
        </Box>
    );
}