export function objectMap<T, U>(obj: T, u: (k: string, v: T[keyof T]) => U) {
    // @ts-expect-error
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, u(k, v)]));
}