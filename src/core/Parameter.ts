interface TextParameter {
    type:       "text";
    minLength:  number;
    maxLength:  number;
    default:    string;
}

interface NumberParameter {
    type:       "number";
    min:        number;
    max:        number;
    step?:      number;
    default:    number;
}

interface SelectParameter<T> {
    type:       "select";
    options:    T[];
    default:    T;
}

interface OptionParameter {
    type:       "option";
    checked:    boolean;
    default:    boolean;
}

interface ParameterMetadata {
    name:   string;
    desc?:  string;
}

type ParameterUnion = TextParameter | NumberParameter | SelectParameter<any> | OptionParameter;

/**
 * Parameter metadata (name, description, ...) and specific data type information
 */
export type Parameter = ParameterMetadata & ParameterUnion;

/**
 * Map parameter id(s) to parameter information
 */
export type ParameterMap = {
    [id: string]: Parameter
};

export type ParameterValues<T extends ParameterMap = ParameterMap> = {
    [key in keyof T]: T[key]["default"]
};