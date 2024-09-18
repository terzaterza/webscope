export function objectMap<T, U>(obj: T, u: (k: string, v: T[keyof T]) => U) {
    // @ts-expect-error
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, u(k, v)]));
}

const magnitudeUnits = [
    'p', 'n', '&micro;', 'm', '', 'k', 'M', 'G', 'T'
];

export function numberSIFormat(x: number): string {
    const exp = Math.log10(Math.abs(x));
    if (exp < -15)
        return "0";

    const exp1000 = Math.max(-4, Math.min(4, Math.floor(exp / 3)));
    return (x * Math.pow(1000, -exp1000)).toPrecision(3) + magnitudeUnits[exp1000 + 4];
}