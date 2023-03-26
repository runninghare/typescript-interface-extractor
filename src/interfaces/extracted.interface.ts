
export interface IntExtractedNode {
    name?: string;
    type?: IntExtractedNode;
    text?: string;
    parents?: string[];
    isOptional?: boolean;
    isProperty?: boolean;
    jsDoc?: string;
    value?: any;
    typeParameters?: string[];
    children?: IntExtractedNode[];
  }