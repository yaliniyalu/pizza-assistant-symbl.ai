

class Timer {
    constructor(callback, timeout) {
        this.callback = callback;
        this.timeout = timeout;
        this.handler = null;
    }

    onTimeout() {
        this.callback();
    }

    start() {
        this.restart();
    }

    stop() {
        clearTimeout(this.handler);
    }

    pause() {
        this.stop();
    }

    resume() {
        this.start();
    }

    restart() {
        this.stop();
        this.handler = setTimeout(this.onTimeout.bind(this), this.timeout);
    }
}

module.exports = Timer;
