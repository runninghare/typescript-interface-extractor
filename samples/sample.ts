
import { IntClass, IntInterest, IntLabel, TAction } from './sample-sub';

/**
 * Grade enum
 */
enum EGrade {
    FAILED = 100,
    PASSED,
    OK,
    GOOD,
    EXCELLENT
}

/**
 * Student interface
 */
export interface IntStudent<T> extends IntLabel, IntInterest {

    /**
     * Name of the student
     */
    name: string;

    /**
     * Type of the student
     */
    type: T;

    /**
     * Score of the student
     */
    score?: number;
    studentId: number | string;
    gender: 'male'|'female';
    class?: IntClass[] | number[][] | string;

    action: TAction;

    authentication: auth;

    grade: Array<EGrade>;

    details?: Array<{
        [key: string]: any;
    }> | null;
}

export class auth {
    constructor() {
        console.log('auth');
    }
}

export interface IntIrrelevant {
    name: string;
}