import { Waveform, WaveformType } from "./Waveform";

/**
 * Base class (interface) for all streams which
 * calls the registered callback once more data is available
 */
export abstract class WaveformStream {
    /**
     * @todo Can use this to fix the waveform type produced
     * by this stream which might eliminate errors when
     * changing waveform data type after using that waveform
     * as input to an decoder
     */
    // public readonly outputType: WaveformType;

    /**
     * Used by the Session object to set the callback
     * for updating the data of the correct waveform instance
     */
    public setCallback(callback: (data: Waveform) => void): void {
        this.onDataRecv = callback;
    }

    /**
     * Call from derived stream class once the
     * raw data has been converted to a waveform
     */
    protected onWaveformReady(data: Waveform): void {
        /** @todo Add this */
        // console.assert(data.dataType === this.outputType);

        if (this.onDataRecv)
            this.onDataRecv(data);
    }

    /**
     * @todo Can set as readonly and assign from constructor
     */
    private onDataRecv?: (data: Waveform) => void;
}

export class TextDelimitedStream extends WaveformStream {
    
    public parseText(text: string, delimiter: string) {
        // deduce waveform type and call onDataRecv
    }
}

export class FileWaveformStream extends WaveformStream {
    
    public readFile(file: File) {
        // can also use TextDelimitedStream.parseText
    }
}

export class DecoderWaveformStream extends WaveformStream {
    // private decoder: Decoder;
    // private inputs: {[ch: string]: string}; // map decoder channel to waveform instance name
}

export class SerialPortWaveformStream extends WaveformStream {
    // private port: SerialPort;
}

export class NetworkWaveformStream extends WaveformStream {
    // private websocket: WebSocket
}