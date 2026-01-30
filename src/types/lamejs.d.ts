declare module 'lamejs' {
    export class Mp3Encoder {
        constructor(channels: number, samplerate: number, kbps: number);
        encodeBuffer(left: Int16Array, right?: Int16Array): Int8Array;
        flush(): Int8Array;
    }
}

declare module 'lamejs/lame.all.js' {
    import * as lame from 'lamejs';
    export const Mp3Encoder: typeof lame.Mp3Encoder;
    const lamejs: {
        Mp3Encoder: typeof lame.Mp3Encoder;
    };
    export default lamejs;
}
