
type TLabel = string | number | boolean;

export interface IntLabel {
    id: string;
    label: TLabel
}

export interface IntInterest {
    subjects: string[]
}

export interface IntClass {
    name: string;
}

export type TAction = (input: string) => string;