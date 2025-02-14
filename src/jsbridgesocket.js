// Get data from jsbridge 
export class JSbridgeSocket {
    constructor(url, protocols) {
        this.url = url;
        this.protocols = protocols;
        this.onOpenCallback = function (event) { };
        this.onErrorCallback = function (error) { };
        this.onMessageCallback = function (data) { };
        this.onCloseCallback = function (event) { };
        this.syncReadyState();
        this.callTimer = setInterval(this.syncConnectionData, 20);
    }

    set onopen(callback) {
        this.onOpenCallback = callback;
    }

    get onopen() {
        return this.onOpenCallback;
    }

    set onerror(callback) {
        this.onErrorCallback = callback;
    }

    get onerror() {
        return this.onErrorCallback;
    }

    set onmessage(callback) {
        this.onMessageCallback = callback;
    }

    get onmessage() {
        return this.onMessageCallback;
    }

    set onclose(callback) {
        this.onCloseCallback = callback;
    }

    get onclose() {
        return this.onCloseCallback;
    }

    syncReadyState() {
    }

    close() {
        if (this.callTimer !== undefined) {
            clearInterval(this.callTimer);
            this.callTimer = undefined;
        }
        this.syncReadyState();
    }

    send(data) {
        this.syncReadyState();
    }
}