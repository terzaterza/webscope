import { DecoderMetadata, InputChannels } from "../../../core/Decoder";
import { ParameterMap, ParameterValues } from "../../../core/Parameter";
import { registerStream } from "../../../core/Stream";
import { FrameDecoderStream } from "../FrameDecoder";

const uartParameters = {
    "baudRate": {
        name: "Baud rate",
        type: "number",
        min: 1,
        max: 1e6,
        step: 100,
        default: 115200
    },
    "dataBits": {
        name: "Data bits",
        type: "select",
        options: [7, 8, 9],
        default: 8
    },
    "parityBit": {
        name: "Parity bit",
        type: "select",
        options: ["NONE", "EVEN", "ODD"],
        default: "NONE"
    },
    "stopBits": {
        name: "Stop bits",
        type: "select",
        options: [1, 2],
        default: 1
    }
} satisfies ParameterMap;

const uartInput = {
    "data": { name: "TX/RX", dataType: "binary" }
} satisfies InputChannels;

/**
 * @todo Instead of adding decoder: true to each decoder metadata,
 * add registerDecoder version of registerStream which adds this line
 * to each metadata object
 */
const uartMetadata = {
    name: "UART Decoder",
    params: uartParameters,
    input: uartInput,
    output: {"bytes": "frame"},
    decoder: true
} satisfies DecoderMetadata;

/**
 * 
 */
class UARTDecoder extends FrameDecoderStream<typeof uartMetadata> {
    
    /**
     * @todo Remove constructor from derived classes and pass the metadata
     * to the base class constructor during instantiation
     */
    constructor(initialParameters: ParameterValues<typeof uartParameters>) {
        super(uartMetadata, initialParameters);
    }

    protected async frameDecode() {
        let fsm: "WAIT_IDLE" | "WAIT_START" | "READ_BYTE" | "CHECK_PARITY" | "WAIT_STOP" = "WAIT_IDLE";
        let byte: number = 0;

        const parameters = this.getParameterValues();
        
        const TIME_HALF_BIT = 0.5 / parameters.baudRate;
        const TIME_FULL_BIT = 1 / parameters.baudRate;

        // Infinite while loop is used because number of
        // frames in the signal is not known in advance
        while (true) {
            switch (fsm) {
                case "WAIT_IDLE":
                    /* Wait for signal to be high to signify idle state */
                    await this.waitTrigger({"idle": {"data": "high"}});
                    fsm = "WAIT_START";
                    break;
                case "WAIT_START":
                    /* Wait for the data line to go low to signal the start of the message */
                    await this.waitTrigger({"start": {"data": "falling"}});
                    this.startFrame("bytes", "START");
                    await this.waitTime(TIME_FULL_BIT);
                    this.endFrame("bytes");
                    fsm = "READ_BYTE";
                    break;
                case "READ_BYTE":
                    this.startFrame("bytes");
                    /* Start reading the byte at the middle of the first bit */
                    byte = (await this.waitTime(TIME_HALF_BIT))["data"];

                    for (let i = 1; i < parameters.dataBits; i++) {
                        const bit = (await this.waitTime(TIME_FULL_BIT))["data"];
                        byte = (byte << 1) | bit;
                    }
                    /* End the frame at the end of the last bit */
                    await this.waitTime(TIME_HALF_BIT);
                    this.endFrame("bytes", byte);

                    fsm = "CHECK_PARITY";
                    break;
                case "CHECK_PARITY":
                    if (parameters.parityBit === "NONE") {
                        fsm = "WAIT_STOP";
                        break;
                    } else {
                        /* Start the frame for the result of the parity check */
                        this.startFrame("bytes");
                        const parityBit = (await this.waitTime(TIME_HALF_BIT))["data"];
                        
                        /* Compute the parity of the data bits */
                        let dataParity = parityBit === 1;
                        for (let i = 0; i < parameters.dataBits; i++) {
                            if (byte & (1 << i))
                                dataParity = !dataParity;
                        }
                        const parityOk = dataParity === (parameters.parityBit === "ODD");

                        await this.waitTime(TIME_HALF_BIT);
                        this.endFrame("bytes", "Parity: " + (parityOk ? "OK" : "ERROR"));
                        /** @todo Add types of frames such as info, warning, error */
                    }
                    break;
                case "WAIT_STOP":
                    this.startFrame("bytes", "START");
                    
                    /* Assert that line is high at the stop bit */
                    console.assert((await this.waitTime(TIME_HALF_BIT))["data"] === 1);
                    for (let i = 1; i < parameters.stopBits; i++) {
                        console.assert((await this.waitTime(TIME_FULL_BIT))["data"] === 1);
                    }

                    await this.waitTime(TIME_HALF_BIT);
                    this.endFrame("bytes");
                    fsm = "WAIT_IDLE";
                    break;
            }
        }
    }

}

registerStream("Decoder", uartMetadata, UARTDecoder);