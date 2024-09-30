import { DecoderMetadata, DecoderStream, InputChannels, InputSamples, InputWaveforms } from "../../core/Decoder";
import { ParameterValues } from "../../core/Parameter";
import { objectMap, PriorityQueue } from "../../core/Util";
import { AnalogWaveform, BinaryWaveform, Frame, FrameWaveform, WaveformFromType, WaveformType } from "../../core/Waveform";

interface AnalogTrigger {
    thresh: number;
    level:  "high" | "low";
}

type BinaryTrigger = "high" | "low" | "rising" | "falling" | "edge";

type TriggerFromDataType<T extends WaveformType> =
    T extends AnalogWaveform["dataType"] ? AnalogTrigger :
    T extends BinaryWaveform["dataType"] ? BinaryTrigger :
    never;

function checkTrigger(
    dataType:   WaveformType,
    trigger:    AnalogTrigger | BinaryTrigger,
    prevValue:  number,
    value:      number
): boolean {
    if (dataType === "analog") {
        const analogTrigger = trigger as AnalogTrigger;
        switch (analogTrigger.level) {
            case "high":    return value >= analogTrigger.thresh;
            case "low":     return value <= analogTrigger.thresh;
        }
    } else {
        const binaryTrigger = trigger as BinaryTrigger;
        switch (binaryTrigger) {
            case "high":    return value === 1;
            case "low":     return value === 0;
            case "rising":  return prevValue === 0 && value === 1;
            case "falling": return prevValue === 1 && value === 0;
            case "edge":    return prevValue !== value;
        }
    }
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
 * Used to track the state of individual triggers in a TriggerSet
 */
type TriggerSetState = {
    [condition: string]: {[ch: string]: boolean}
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
     * Implementation of the decoding process for the frame decoder
     */
    protected abstract frameDecode(): Promise<void>;
    
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
    protected waitTime(seconds: number): Promise<InputSamples<T["input"]>> {
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
                return new Promise((resolve, reject) => {
                    this.flush();
                    this.timePromise = {time: nextTime, resolve: resolve, reject: reject};
                });
        }

        /* If all the waveforms have a valid sample at this time point
        increase the time offset and return the samples */
        this.timeOffset = nextTime;
        return Promise.resolve(objectMap(this.currentInput,
            (ch, waveform) => waveform.data[samplePositions[ch]])
        );
    }

    /**
     * Wait for any one of the multiple trigger conditions, where
     * each conditions consists of required value (or change of value)
     * for some of the input channels
     */
    protected waitTrigger(triggerSet: TriggerSet<T>, triggerSetState?: TriggerSetState): Promise<[keyof typeof triggerSet, InputSamples<T["input"]>]> {
        interface QueueItem {
            ch:         keyof T["input"];
            waveform:   InputWaveforms<T["input"]>[string];
            sampleTime: number;
        };

        if (!this.currentInput)
            throw new NoInputAssignedError();

        /* A priority queue is used to keep track of positions of samples
        for each of the waveforms, such that the waveform with the earliest
        next sample is processed */
        const queue = new PriorityQueue<QueueItem>(
            Object.keys(this.currentInput).length,
            (a: QueueItem, b: QueueItem) => {
                /* If two samples have the same time, process the one with
                the smaller time increment (bigger sample rate) */
                if (a.sampleTime !== b.sampleTime)
                    return a.sampleTime < b.sampleTime;
                return a.waveform.sampleRate > b.waveform.sampleRate;
            }
        );

        /* Initialize the queue with the input waveforms
        
        Indices are chosen as first after the current time
        position (rounded up) since we don't want to trigger on
        something that happened before the current time */
        for (const ch in this.currentInput) {
            const waveform = this.currentInput[ch];
            /* Only add channels to the queue which are in at least one condition */
            if (Object.values(triggerSet).some((chTriggers) => ch in chTriggers))
                queue.add({
                    ch: ch,
                    waveform: waveform,
                    sampleTime: Math.ceil(this.timeOffset * waveform.sampleRate) / waveform.sampleRate
                });
        }

        /* If the trigger set state is undefined (meaning this is not a continuiation
        of a previous waitTrigger - the previous waitTrigger completed successfully),
        skip all the samples which are at the current timeOffset as they were already processed */
        if (!triggerSetState) {
            while (queue.peek()?.sampleTime === this.timeOffset) {
                const item = queue.poll() as QueueItem;
                item.sampleTime += 1 / item.waveform.sampleRate;
                queue.add(item);
            }
        }

        /* Keep track of trigger conditions for each member of the trigger set
        so it doesn't have to be recomputed for each sample (only has to be recomputed
        for the channel whose sample time was changed) */
        const triggerTracker = triggerSetState ?? objectMap(triggerSet, (conditionName, channelTriggers) => 
            objectMap(channelTriggers, (ch, trigger) => false)
        );

        while (true) {
            /* Get the waveform with the earliest unprocessed sample */
            const first = queue.poll() as QueueItem;
            const index = Math.round(first.sampleTime * first.waveform.sampleRate);
            /* Calling Math.round just to get rid of floating point multiplication inaccuracies */

            /* Set the new time point to this sample's time */
            /* This is done here so if the index is out of the bounds,
            on next waitTrigger enter when the indices are calculated,
            this channel is the first one that gets processed */
            this.timeOffset = first.sampleTime;

            /* If there is no data for this waveform at the specified time,
            delay decoding until more data is available */
            if (index >= first.waveform.data.length)
                return new Promise((resolve, reject) => {
                    this.flush();
                    this.triggerPromise = {triggers: triggerSet, triggerState: {...triggerTracker}, resolve: resolve, reject: reject};
                });

            /* Check if this (first's) waveform sample has satisfied any of the conditions */
            const prevValue = first.waveform.data[index > 0 ? (index - 1) : 0];
            const currValue = first.waveform.data[index];
            for (const conditionName in triggerTracker) {
                if (first.ch in triggerTracker[conditionName]) {
                    triggerTracker[conditionName][first.ch as string] = checkTrigger(
                        first.waveform.dataType,
                        triggerSet[conditionName][first.ch] as AnalogTrigger | BinaryTrigger,
                        prevValue,
                        currValue
                    );
                }
            }

            /* Check if any of the condition sets has been fully satisifed */
            for (const conditionName in triggerSet) {
                if (Object.values(triggerTracker[conditionName]).every((v) => v))
                    return Promise.resolve([conditionName, this.getInputAtTime(this.currentInput, this.timeOffset)]);
            }

            /* Update the next time for this waveform and re-add it to the queue */
            first.sampleTime += 1 / first.waveform.sampleRate;
            queue.add(first);
        }
        
        return Promise.reject();
    }

    /**
     * Start a frame at the current position in time
     */
    protected startFrame(ch: keyof T["output"], data?: string | number) {
        if (this.startedFrame[ch])
            throw new Error("Frame already started");

        this.startedFrame[ch] = {start: this.timeOffset, data: data};
    }

    /**
     * End a frame and add it to the output waveform
     */
    protected endFrame(ch: keyof T["output"], data?: string | number) {
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
        /* If decoding from the start, reset the decoder state */
        if (fromStart)
            this.reset();

        /* If a promise exists handle it and exit before calling the decode implementation again */
        if (this.timePromise) {
            const promise = this.timePromise;
            this.timePromise = undefined;

            this.waitTime(promise.time)
                .then((data) => promise.resolve(data))
                .catch(() => promise.reject());
        } else if (this.triggerPromise) {
            const promise = this.triggerPromise;
            this.triggerPromise = undefined;

            this.waitTrigger(promise.triggers)
                .then((data) => promise.resolve(data))
                .catch(() => promise.reject());
        } else {
            /* No unfinished promises exist, so continue decoding from the last time point */
            try {
                this.currentInput = input;
                this.frameDecode();
            } catch {
                /* Promise of last started decode was not resolved so we should reset */
                this.reset();
            }
        }        
    }

    /**
     * Output all currently produced frames
     * 
     * Called from reset, and when creating a new promise in waitTime and waitTrigger
     */
    private flush() {
        for (const ch in this.currentOutput) {
            if (this.currentOutput[ch].data.length > 0)
                // @ts-expect-error
                this.onWaveformReady({[ch]: this.currentOutput[ch]});
        }
    }

    /**
     * Reset all state
     */
    private reset() {
        /* If a promise exists, reject it since there will be no new data to fulfill it */
        if (this.timePromise)
            this.timePromise.reject();

        if (this.triggerPromise)
            this.triggerPromise.reject();

        this.flush();

        this.timePromise = this.triggerPromise = undefined;
        this.timeOffset = 0;
        this.startedFrame = {};
        this.currentInput = undefined;

        for (const ch in this.currentOutput)
            this.currentOutput[ch] = {data: [], dataType: "frame"};
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
     * If the `waitTime` method reaches the end of one of the waveforms
     * this promise is set so that on next `decode` call, when new data
     * is available, decoding can continue
     */
    private timePromise?: {
        time: number;
        resolve: (data: InputSamples<T["input"]>) => void;
        reject: () => void
    };

    /**
     * Similar to `timePromise`, allows for continuing the decoding
     * on new data arrival
     */
    private triggerPromise?: {
        triggers: TriggerSet<T>;
        triggerState: TriggerSetState;
        resolve: (data: [keyof TriggerSet<T>, InputSamples<T["input"]>]) => void;
        reject: () => void;
    };
}