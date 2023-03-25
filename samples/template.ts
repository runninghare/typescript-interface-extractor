
interface IntClass<T> {
    name: string;
    location: string[];
}

interface Student<T, M> {
    name: string;
    class: IntClass<T>;
    subjects: Array<T>;
}