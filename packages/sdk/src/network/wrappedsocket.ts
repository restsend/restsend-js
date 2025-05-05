/* eslint-disable @typescript-eslint/no-unsafe-function-type */


// 扩展SocketTask接口，添加readyState属性
interface ExtendedSocketTask extends WechatMiniprogram.SocketTask {
  readyState: number
}


// ported from https://gist.github.com/jhd124/0ea05364ff1fcd7bccf4f3469bd0244c
export class WrappedWxSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  socketOptions: { url: string; protocols: string | string[] }
  url: string
  protocols: string | string[]
  socketTask: ExtendedSocketTask

  onOpenCallback: Function
  onErrorCallback: Function
  onMessageCallback: Function
  onCloseCallback: Function

  readyState: number = 0

  constructor(url: string, protocols: string | string[]) {
    // FIXME 小程序接口与标准 Websocket 对象不完全一致，因此要做兼容处理

    const options = {
      url,
      protocols: typeof protocols === 'string' ? [protocols] : protocols
    }

    this.socketOptions = options
    this.url = url
    this.protocols = options.protocols
    this.socketTask = wx.connectSocket(options) as ExtendedSocketTask
    this.syncReadyState()

    this.onOpenCallback = function () {}
    this.socketTask.onOpen(event => {
      this.syncReadyState()
      this.onOpenCallback.call(this, event)
    })

    this.onErrorCallback = function () {}
    this.socketTask.onError(error => {
      this.syncReadyState()

      // hack: 标准websocket在连接失败的时候会先触发error再触发close，
      // 但微信小程序则只会触发error，为了保证socket在出了问题后能及时重连，这里手动触发一次close
      setTimeout(() => {
        this.onCloseCallback()
      }, 0)

      this.onErrorCallback.call(this, error)
    })

    this.onMessageCallback = function () {}
    this.socketTask.onMessage(data => {
      this.syncReadyState()
      this.onMessageCallback.call(this, data)
    })

    this.onCloseCallback = function () {}
    this.socketTask.onClose(event => {
      this.syncReadyState()
      this.onCloseCallback.call(this, event)
    })
  }

  syncReadyState() {
    this.readyState = this.socketTask.readyState
  }

  set onopen(callback) {
    this.onOpenCallback = callback
  }

  get onopen() {
    return this.onOpenCallback
  }

  set onerror(callback) {
    this.onErrorCallback = callback
  }

  get onerror() {
    return this.onErrorCallback
  }

  set onmessage(callback) {
    this.onMessageCallback = callback
  }

  get onmessage() {
    return this.onMessageCallback
  }

  set onclose(callback) {
    this.onCloseCallback = callback
  }

  get onclose() {
    return this.onCloseCallback
  }

  close() {
    if (this.socketTask.readyState < 2) {
      this.socketTask.close({})
    }
    this.syncReadyState()
  }

  send(data: string | ArrayBuffer) {
    this.socketTask.send({
      data
    })
    this.syncReadyState()
  }
}
