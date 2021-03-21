const fs = require("fs");

class Recorder {
    constructor(filename) {
        this.start(filename);
    }

    start(filename) {
        this.stream = fs.createWriteStream(__dirname + `/records/${filename}.wav`, { encoding: 'binary' });
        this.stream.write(Buffer.from([
            0x52,0x49,0x46,0x46,0x62,0xb8,0x00,0x00,0x57,0x41,0x56,0x45,0x66,0x6d,0x74,0x20,
            0x12,0x00,0x00,0x00,0x07,0x00,0x01,0x00,0x40,0x1f,0x00,0x00,0x80,0x3e,0x00,0x00,
            0x02,0x00,0x04,0x00,0x00,0x00,0x66,0x61,0x63,0x74,0x04,0x00,0x00,0x00,0xc5,0x5b,
            0x00,0x00,0x64,0x61,0x74,0x61,0x00,0x00,0x00,0x00,
        ]));
    }

    record(payload) {
        this.stream.write(Buffer.from(payload, 'base64'));
    }

    stop() {
        this.stream.write("", () => {
            let fd = fs.openSync(this.stream.path, 'r+');
            let count = this.stream.bytesWritten;
            count -= 58;
            fs.writeSync(
                fd,
                Buffer.from([
                    count % 256,
                    (count >> 8) % 256,
                    (count >> 16) % 256,
                    (count >> 24) % 256,
                ]),
                0,
                4,
                54,
            );
        });
    }
}

module.exports = Recorder;