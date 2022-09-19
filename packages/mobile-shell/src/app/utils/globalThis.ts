if (typeof globalThis === 'undefined') {
    // @ts-ignore We need this for some fucking old devices!
    window.globalThis = window;
}

export {};