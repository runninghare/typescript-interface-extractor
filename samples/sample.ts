
import { IntClass, IntInterest, IntLabel, TAction } from './sample-sub';

enum EGrade {
    FAILED = 100,
    PASSED,
    OK,
    GOOD,
    EXCELLENT
}

export interface IntStudent extends IntLabel, IntInterest {
    name: string;
    score?: number;
    studentId: number | string;
    gender: 'male'|'female';
    class?: IntClass[] | number[][] | string;

    action: TAction;

    grade: Array<EGrade>;

    details?: Array<{
        [key: string]: any;
    }> | null;
}