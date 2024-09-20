import { channel } from "diagnostics_channel";
import { DecoderMetadata, DecoderStream, InputSamples, InputWaveforms } from "../../core/Decoder";
import { ParameterValues } from "../../core/Parameter";
import { objectMap, PriorityQueue } from "../../core/Util";
import { AnalogWaveform, BinaryWaveform, Frame, FrameWaveform, WaveformFromType, WaveformType } from "../../core/Waveform";

interface AnalogTrigger {
    level:  number;
    cross:  "above" | "below";
}

interface BinaryTrigger {
    edge:   "rising" | "falling" | "both";
}

type TriggerFromDataType<T extends WaveformType> =
    T extends AnalogWaveform["dataType"] ? AnalogTrigger :
    T extends BinaryWaveform["dataType"] ? BinaryTrigger :
    never;

function checkTrigger<T extends WaveformType>(
    trigger:    TriggerFromDataType<T>,
    prevValue:  WaveformFromType<T>["data"][number],
    value:      WaveformFromType<T>["data"][number]
): boolean {
    return false;
}

/**
 * Collection of conditions where a condition is a mapping
 * of some (possibly all) input channels to a trigger for
 * that type of waveform
 */
type TriggerSet<T extends DecoderMetadata> = {
    [name: string]: {[ch in keyof T["input"]]?: TriggerFromDataType<T["input"][ch]["dataType"]>}
};

/**
 * Used when calling some of the wait functions without
 * previously assigning the input
 */
class NoInputAssignedError extends Error {
    constructor() {
        super("No input assigned");
    }
}

/**
 * Allow only frame waveforms as output
 */
interface FrameDecoderMetadata extends DecoderMetadata {
    output: {[ch: string]: FrameWaveform["dataType"]};
}

/**
 * Base class for all streams which return frame waveforms and determine
 * the length of the frames based on triggering on specific waveform conditions
 */
export abstract class FrameDecoderStream<T extends FrameDecoderMetadata> extends DecoderStream<T> {

    constructor(metadata: T, params: ParameterValues<T["params"]>) {
        super(metadata, params);
        this.reset();
    }
    
    /**
     * Skip `seconds` ahead the current time position
     * 
     * If no input waveforms have samples at that time position,
     * the position of the first next sample will be taken
     * 
     * @note If not all waveforms have the same sample rate, ones
     * which don't have a sample at this exact point in time will
     * be approximated by their last sample
     * 
     */
    protected async waitTime(seconds: number): Promise<InputSamples<T["input"]>> {
        if (!this.currentInput)
            throw new NoInputAssignedError();

        /** @todo Can also allow negative delay, but make sure that non of the indices later are negative */
        console.assert(seconds > 0);
        const nextTime = this.timeOffset + seconds;

        /* Map the new time to the appropriate index of each waveform based on the sample rate */
        const samplePositions = objectMap(this.currentInput,
            (ch, waveform) => Math.floor(nextTime * waveform.sampleRate)
        );

        /* If this time point (`nextTime`) is beyond any of the current waveforms, wait
        for the next stream of data, which will be resolved through a promise */
        for (const ch in samplePositions) {
            if (samplePositions[ch] >= this.currentInput[ch].data.length)
                return this.pauseDecoding(nextTime);
        }

        /* If all the waveforms have a valid sample at this time point
        increase the time offset and return the samples */
        this.timeOffset = nextTime;
        return Promise.resolve(objectMap(this.currentInput,
            (ch, waveform) => waveform.data[samplePositions[ch]])
        );
    }

    /**
     * 
     */
    protected waitTrigger(triggerSet: TriggerSet<T>): Promise<InputSamples<T["input"]>> {
        interface QueueItem {
            sampleTime: number;
            channel:    InputWaveforms<T["input"]>[keyof T["input"]];
            lastValue:  number;
        };

        if (!this.currentInput)
            throw new NoInputAssignedError();

        const queue = new PriorityQueue<QueueItem>(
            Object.keys(this.currentInput).length,
            (a: QueueItem, b: QueueItem) => {
                if (a.sampleTime !== b.sampleTime)
                    return a.sampleTime < b.sampleTime;
                return a.channel.sampleRate > b.channel.sampleRate;
            }
        );

        for (const ch in this.currentInput) {
            queue.add({
                sampleTime: Math.floor(this.timeOffset * this.currentInput[ch].sampleRate),
                channel:    this.currentInput[ch],
                lastValue:  this.currentInput[ch].data[0]
            });
        }

        /** @todo Keep track of trigger conditions for each member of the trigger set */
        /** so it doesn't have to be recomputed for each sample (only has to be recomputed
         * for the channel whose sample time was changed) */

        while (true) {
            const first = queue.poll() as QueueItem;
            const nextTime = first.sampleTime + 1 / first.channel.sampleRate;
            const nextIndex = Math.floor(nextTime * first.channel.sampleRate);

            if (nextIndex >= first.channel.data.length)
                return this.pauseDecoding(undefined, triggerSet);

            first.sampleTime = nextTime;
            first.lastValue = first.channel.data[nextIndex];
            queue.add(first);

            // const samples = queue.toArray().map((v) => [v.channel.]) - STOPPED HERE

            this.timeOffset = (queue.peek() as QueueItem).sampleTime;
        }
        
        return Promise.reject();
    }

    /**
     * Start a frame at the current position in time
     */
    protected startFrame(ch: keyof T["output"], data?: string) {
        if (this.startedFrame[ch])
            throw new Error("Frame already started");

        this.startedFrame[ch] = {start: this.timeOffset, data: data};
    }

    /**
     * End a frame and add it to the output waveform
     */
    protected endFrame(ch: keyof T["output"], data?: string) {
        if (!this.startedFrame[ch])
            return new Error("Frame not started");
        
        if (data)
            this.startedFrame[ch].data = data;
        else
            console.assert(this.startedFrame[ch].data);

        this.startedFrame[ch].end = this.timeOffset;
        this.currentOutput[ch].data.push(this.startedFrame[ch] as Frame);
        this.startedFrame[ch] = undefined;
    }

    /**
     * Frame decoder implementation
     */
    protected async decode(input: InputWaveforms<T["input"]>, fromStart: boolean) {
        if (fromStart)
            this.reset();

        if (this.waitPromise) {
            const promise = this.waitPromise;
            this.waitPromise = undefined;

            if (promise.type === "time") {
                this.waitTime(promise.data as number)
                    .then((data) => promise.resolve(data))
                    .catch(() => promise.reject());
            } else {
                this.waitTrigger(promise.data as TriggerSet<T>)
                    .then((data) => promise.resolve(data))
                    .catch(() => promise.reject());
            }
        }
        
        try {
            /** @todo Call abstract method of this class (async frameDecode...) */
        } catch {
            /* Promise of last started decode was not resolved so we should reset */
            this.reset();
        }
    }

    /**
     * Reset all state
     */
    private reset() {
        /* If a promise exists, reject it since there will be no new data to fulfill it */
        if (this.waitPromise)
            this.waitPromise.reject();

        this.waitPromise = undefined;
        this.timeOffset = 0;
        this.startedFrame = {};
        this.currentInput = undefined;
        for (const ch in this.currentOutput)
            this.currentOutput[ch] = {data: [], dataType: "frame"};
    }

    /**
     * 
     */
    private pauseDecoding(time?: number, triggerSet?: TriggerSet<T>): Promise<InputSamples<T["input"]>> {
        console.assert(!this.waitPromise);
        
        if (time) {
            return new Promise((resolve, reject) => {
                this.waitPromise = {type: "time", data: time, resolve: resolve, reject: reject};
            });
        } else {
            if (!triggerSet)
                throw new Error("Invalid arguments for decoding pause");
            
            return new Promise((resolve, reject) => {
                this.waitPromise = {type: "trigger", data: triggerSet, resolve: resolve, reject: reject};
            });
        }
    }

    /**
     * Input waveforms set by the last call of the decode method
     */
    private currentInput?: InputWaveforms<T["input"]>;

    /**
     * Output buffer for adding the frames to
     */
    // @ts-expect-error - Bug? - Check objectMap
    private currentOutput: {[ch in keyof T["output"]]: FrameWaveform} = objectMap(this.metadata.output,
        (ch, frameType) => ({dataType: frameType, data: []})
    );

    /**
     * Frame currently in the making by the stream
     */
    private startedFrame: Partial<{[ch in keyof T["output"]]: Partial<Frame>}> = {};

    /**
     * Offset from the sample of the input waveforms, in seconds
     */
    private timeOffset: number = 0;

    /**
     * If this promise object (tuple) exits, it means either `waitTime` or
     * `waitTrigger` reached the end of the waveforms without meeting the condition
     * 
     * On next decode call, this should first be resolved 
     */
    private waitPromise?: {
        type: "time" | "trigger",
        data: number | TriggerSet<T>,
        resolve: (data: InputSamples<T["input"]>) => void,
        reject: () => void
    };
}