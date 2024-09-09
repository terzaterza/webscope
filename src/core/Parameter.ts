export interface TextParameter {
    type:       "text";
    minLength:  number;
    maxLength:  number;
    default?:   string;
}

export interface NumberParameter {
    type:       "number";
    min:        number;
    max:        number;
    step:       number;
    default?:   number;
}

export interface SelectParameter<T> {
    type:       "select";
    options:    T[];
    default?:    T;
}

export interface OptionParameter {
    type:       "option";
    checked:    boolean;
    default?:   boolean;
}

export interface ParameterMetadata {
    name?:          string;
    description?:   string;
}


type ParameterUnion = TextParameter | NumberParameter | SelectParameter<any> | OptionParameter;

export type ParameterList = (ParameterUnion & ParameterMetadata)[];

export type ParameterMap = {
    [name: string]: ParameterUnion & ParameterMetadata
};

export type ParameterValues<T extends ParameterMap> = {
    [key in keyof T]: T[key]["default"]
};