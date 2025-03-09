import { DecoderMetadata } from "../../../core/Decoder";
import { ParameterMap, ParameterValues } from "../../../core/Parameter";
import { registerStream } from "../../../core/Stream";
import { FrameDecoderStream } from "../FrameDecoder";

const i2cParameters = {
    "addr10": {
        name: "Address 10-bit",
        type: "option",
        default: false
    }
} satisfies ParameterMap;

const i2cInput = {
    "scl": {name: "SCL", dataType: "binary"},
    "sda": {name: "SDA", dataType: "binary"}
} satisfies DecoderMetadata["input"];

const i2cMetadata = {
    name: "I2C Decoder",
    params: i2cParameters,
    input: i2cInput,
    output: {"bits": {dataType: "frame"}, "bytes": {dataType: "frame"}}
} satisfies DecoderMetadata;

/**
 * I2C signal decoder
 * 
 * @example To test, signals:
 * SDA: 00100 1111000011110000111111111111 0000 0000 11110000111111111111000000000000 0011
 * SCL: 00110 0110011001100110011001100110 0110 0110 01100110011001100110011001100110 0111
 * OUT: START ADDR: 0x57                   W    ACK  DATA: 0xb8                       STOP
 */
class I2CDecoder extends FrameDecoderStream<typeof i2cMetadata> {

    constructor(initialParameters: ParameterValues<typeof i2cParameters>) {
        super(i2cMetadata, initialParameters);
    }
    
    protected async frameDecode() {
        /** @todo Can move these to some I2CDecoder.state and reset that state by overriding Decoder.reset() */
        /** @todo Add bits decoding */
        let fsm: "wait_idle" | "wait_start" | "read_byte" | "wait_ack" = "wait_idle";
        let waitAddr: boolean = true;
        let byte: number = 0;

        while (true) {
            switch (fsm) {
                case "wait_idle":
                    /* Wait for both lines to be high to signify the idle state */
                    await this.waitTrigger({"IDLE": {"sda": "high", "scl": "high"}});
                    fsm = "wait_start";
                    break;
                case "wait_start":
                    /* Wait for the data line to go low to signal the start of the message */
                    await this.waitTrigger({"START": {"sda": "falling", "scl": "high"}});
                    this.startFrame("bytes", "START");
                    await this.waitTrigger({"SCL_L": {"scl": "low"}});
                    this.endFrame("bytes");
                    fsm = "read_byte";
                    break;
                case "read_byte":
                    /* Read the first bit and check if this is a repeated start, stop, or another byte */
                    byte = (await this.waitTrigger({"SCL_R": {"scl": "rising"}}))[1].sda << 7;
                    this.startFrame("bytes");

                    const [cond, _] = await this.waitTrigger({
                        "NEXT_BYTE": {"scl": "falling"},
                        "REP_START": {"sda": "falling"},
                        "STOP": {"sda": "rising"}
                    });

                    if (cond === "STOP") {
                        this.endFrame("bytes", "STOP");
                        fsm = "wait_start";
                        break;
                    } else if (cond === "REP_START") {
                        await this.waitTrigger({"SCL_L": {"scl": "low"}});
                        this.endFrame("bytes", "RS");
                        break;
                    }

                    for (let i = 1; i < 8; i++) {
                        const inputValues = (await this.waitTrigger({"SCL_R": {"scl": "rising"}}))[1];
                        byte |= (inputValues.sda << (7 - i));

                        if (waitAddr && i === 7) {
                            this.endFrame("bytes", byte >> 1);
                            this.startFrame("bytes", inputValues.sda === 1 ? "R" : "W");
                        }
                    }
                    
                    await this.waitTrigger({"SCL_F": {"scl": "falling"}});
                    if (waitAddr) {
                        waitAddr = false;
                        this.endFrame("bytes");
                    } else
                        this.endFrame("bytes", byte);
                    fsm = "wait_ack";
                    break;
                case "wait_ack":
                    const input = (await this.waitTrigger({"ACK": {"scl": "rising"}}))[1];
                    this.startFrame("bytes", input.sda === 0 ? "ACK" : "NACK");
                    await this.waitTrigger({"SCL_L": {"scl": "low"}});
                    this.endFrame("bytes");
                    fsm = "read_byte";
                    break;
            }
        }
    }
    
}

registerStream("Decoder", i2cMetadata, I2CDecoder);