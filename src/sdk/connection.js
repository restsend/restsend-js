/**
 * Connection class
 */
import { ChatRequest } from './types'
import { logger, randText } from './utils'
import { Callback } from './callback'
const REQUEST_ID_LENGTH = 8
const CHAT_ID_LENGTH = 8
const REQUEST_TIMEOUT = 120000 // 2 minutes
const keepaliveInterval = 30 * 1000 // 30 seconds
const reconnectInterval = 5 * 1000 // 5 seconds

export class Connection extends Callback {
    constructor(endpoint) {
        super()

        this.device = 'web'
        endpoint = endpoint || ''
        this.endpoint = endpoint.replace(/http/, 'ws')
        this.start()
    }
    /**
     * app切换到前台后会立即触发重连，保证链接的效果
    */
    async appActive() {
        await this.immediateConnectIfNeed()
    }

    /**
     * app切换到后台,重联降低频率
     */
    appDeactive() { }

    /**
     * 获取websocket链接状态
     * @returns {String} 返回状态: connected 或者 disconnected
     */
    get networkState() {
        return this.status
    }

    start() {
        this.running = true // 如果为false，表示已经关闭, 不要尝试重联

        this.ws = null
        this.keepalive = null
        this.reconnect = null
        this.status = 'disconnected'
        this.waiting = []
        this.pending = []
    }

    shutdown() {
        this.running = false
        if (this.ws) {
            this.ws.close()
            this.ws = null
        }
        if (this.keepalive) {
            clearInterval(this.keepalive)
            this.keepalive = null
        }
        if (this.reconnect) {
            clearInterval(this.reconnect)
            this.reconnect = null
        }
    }

    tryReconnect() {
        if (this.status === 'disconnected' && this.running) {
            this.connect().then(() => { })
        }
    }

    async immediateConnectIfNeed() {
        return await this.connect()
    }
    /**
     * 登陆成功后手工创建websocket的链接
     */
    async connect() {
        if (this.status === 'connected' || this.status === 'connecting')
            return

        this.status = 'connecting'
        this.onConnecting()
        let endpoint = this.endpoint

        if (!this.endpoint) {
            // get current location and scheme
            const loc = window.location
            const scheme = loc.protocol === 'https:' ? 'wss' : 'ws'
            endpoint = `${scheme}://${loc.host}`
        }

        if (this.keepalive) {
            clearInterval(this.keepalive)
            this.keepalive = null
        }
        if (!this.reconnect) {
            this.reconnect = setInterval(() => {
                this.tryReconnect()
            }, reconnectInterval)
        }
        const url = `${endpoint}/api/connect?device=${this.device}`

        if (this.newWebSocket) {
            this.ws = this.newWebSocket(url)
        } else {
            this.ws = new WebSocket(url)
        }

        this.ws.onopen = this._onOpen.bind(this)
        this.ws.onclose = this._onClose.bind(this)
        this.ws.onerror = this._onError.bind(this)
        this.ws.onmessage = this._onMessage.bind(this)
    }

    _onOpen() {
        this.status = 'connected'
        this.onConnected()

        let pending = this.pending.splice(0, this.pending.length)
        if (pending.length > 0) {
            logger.debug('flush pending requests', pending.length)
            pending.forEach((req) => {
                this.ws.send(JSON.stringify(req))
            })
        }

        this.keepalive = setInterval(() => {
            if (this.status !== 'connected') {
                clearInterval(this.keepalive)
                this.keepalive = null
                return
            }
            this.ws.send(JSON.stringify({ type: 'nop' }))
        }, keepaliveInterval)
    }

    _onClose(event) {
        this.status = 'disconnected'
        logger.warn('websocket close', event.code, event.reason)
        this.onNetBroken(event.reason)
    }

    _onError(event) {
        this.status = 'disconnected'
        logger.warn('websocket error', event)
        this.onNetBroken('error')
    }

    _onMessage(event) {
        if (event.type === 'ping') {
            this.ws.send(JSON.stringify({ type: 'pong' }))
            return
        }
        logger.debug('incoming', event.type, event.data)

        if (!event.data)
            return

        let req = JSON.parse(event.data)
        if (req.type === 'resp') {
            this._onResponse(req) // 处理响应
            return
        }
        req = Object.assign(new ChatRequest(), req)
        req.receivedAt = Date.now()
        // 调用子类的处理函数
        this.handleRequest(req).then((code) => {
            if (req.id)
                this.sendResponse(req.id, code || 200)
        })
    }

    sendResponse(id, code) {
        this.doSendRequest({
            type: 'resp',
            id,
            code,
        }).then(() => { })
    }

    async _onResponse(req) {
        const w = this.waiting[req.id]
        if (w) {
            delete this.waiting[req.id]
            await w.resolve(w.req)
        }
        else {
            this.logger.warn('no waiting for resp', req)
        }
    }

    async doSendRequest(req, retry) {
        if (!this.running) {
            throw new Error('connection is shutdown')
        }

        if (this.status !== 'connected') {
            if (retry) {
                logger.debug('add pending', req)
                this.pending.push(req)
                await this.immediateConnectIfNeed()
            }
            return req
        }

        logger.debug('outgoing', req)
        this.ws.send(JSON.stringify(req))
        return req
    }

    async sendAndWaitResponse(req, retry = true) {
        req = Object.assign(new ChatRequest(), req)
        req.id = randText(REQUEST_ID_LENGTH)
        return new Promise((resolve, reject) => {
            this.waiting[req.id] = {
                req,
                resolve,
                reject,
            }

            this.doSendRequest(req, retry).then(() => { })

            setTimeout(() => {
                if (this.waiting[req.id]) {
                    this.waiting[req.id].reject(new Error('timeout'))
                    delete this.waiting[req.id]
                }
            }, REQUEST_TIMEOUT * 1000)
        })
    }

    async processSendChatRequest(topic, req) {
        return req
    }
    /**
     * 正在输入， 只有个人聊天才有
     * @param {Topic} topic
     */
    async doTyping(topic) {
        let req = new ChatRequest()
        req.topicId = topic.id
        req.type = 'typing'
        return await this.doSendRequest(req, false)
    }

    /**
      * 聊天消息已读
      * @param {Topic} topic
      */
    async doRead(topic) {
        let req = new ChatRequest()
        req.topicId = topic.id
        req.type = 'read'
        return await this.doSendRequest(req, false)
    }

    /**
     * 撤回一条消息
     * @param {Topic} topic
     * @param {String} chatId
     */
    async doRecall({ topic, chatId }) {
        let req = await this.sendAndWaitResponse({
            type: 'chat',
            topicId: topic.id,
            chatId,
            content: {
                type: 'recall',
            }
        })
        return await this.processSendChatRequest(topic, req)
    }

    /**
     * 发送文本消息
     * @param {Topic} topic
     * @param {String} text
     * @option @param {Array<String>} mentions 提到的人
     * @option @param {String} replyId 回复的消息id
     */
    async doSendText({ topic, text, mentions, replyId }) {
        let req = await this.sendAndWaitResponse({
            type: 'chat',
            chatId: randText(CHAT_ID_LENGTH),
            topicId: topic.id,
            content: {
                type: 'text',
                text,
                mentions,
                replyId,
            },
        })
        return await this.processSendChatRequest(topic, req)
    }
    /**
     * 发送图片消息
     * @param {Topic} topic
     * @param {String} urlOrData 图片地址或者base64编码的图片内容
     * @option @param {Array<String>} mentions 提到的人
     * @option @param {String} replyId 回复的消息id
     */
    async doSendImage({ topic, urlOrData, mentions, replyId }) {
        let req = await this.sendAndWaitResponse({
            type: 'chat',
            chatId: randText(CHAT_ID_LENGTH),
            topicId: topic.id,
            content: {
                type: 'image',
                text: urlOrData,
                mentions,
                replyId,
            },
        })
        return await this.processSendChatRequest(topic, req)
    }
    /**
     * 发送语音消息
     * @param {Topic} topic
     * @param {String} urlOrData
     * @param {String} duration 语音时长，格式是 00:00
     * @option @param {Array<String>} mentions 提到的人
     * @option @param {String} replyId 回复的消息id
     * */
    async doSendVoice({ topic, urlOrData, duration, mentions, replyId }) {
        let req = await this.sendAndWaitResponse({
            type: 'chat',
            chatId: randText(CHAT_ID_LENGTH),
            topicId: topic.id,
            content: {
                type: 'voice',
                text: urlOrData,
                duration,
                mentions,
                replyId,
            },
        })
        return await this.processSendChatRequest(topic, req)
    }
    /**
     * 发送视频消息
     * @param {Topic} topic
     * @param {String} url 视频地址
     * @param {String} thumbnail 视频缩略图
     * @param {String} duration 视频时长， 格式是 00:00
     * @option @param {Array<String>} mentions 提到的人
     * @option @param {String} replyId 回复的消息id
     */
    async doSendVideo({ topic, url, thumbnail, duration, mentions, replyId }) {
        let req = await this.sendAndWaitResponse({
            type: 'chat',
            chatId: randText(CHAT_ID_LENGTH),
            topicId: topic.id,
            content: {
                type: 'video',
                text: urlOrData,
                thumbnail,
                duration,
                mentions,
                replyId,
            },
        })
        return await this.processSendChatRequest(topic, req)
    }

    /**
     * 发送文件消息
     * @param {Topic} topic
     * @param {String} urlOrData 文件地址或者base64编码的文件内容
     * @param {String} filename 文件名
     * @param {Number} size 文件大小
     * @option @param {Array<String>} mentions 提到的人
     * @option @param {String} replyId 回复的消息id
     * */
    async doSendFile({ topic, urlOrData, filename, size, mentions, replyId }) {
        let req = await this.sendAndWaitResponse({
            type: 'chat',
            chatId: randText(CHAT_ID_LENGTH),
            topicId: topic.id,
            content: {
                type: 'file',
                text: urlOrData,
                placeholder: filename,  // 文件名
                size,
                mentions,
                replyId,
            },
        })
        return await this.processSendChatRequest(topic, req)
    }

    /**
     * 发送位置消息
     * @param {Topic} topic
     * @param {Number} latitude 纬度
     * @param {Number} longitude 经度
     * @param {String} address 地址
     * @option @param {Array<String>} mentions 提到的人
     * @option @param {String} replyId 回复的消息id
     */
    async doSendLocation({ topic, latitude, longitude, address, mentions, replyId }) {
        let req = await this.sendAndWaitResponse({
            type: 'chat',
            chatId: randText(CHAT_ID_LENGTH),
            topicId: topic.id,
            content: {
                type: 'file',
                text: `${latitude},${longitude}`,
                placeholder: address,
                mentions,
                replyId,
            },
        })
        return await this.processSendChatRequest(topic, req)
    }

    /**
     * 发送链接消息
     * @param {Topic} topic
     * @param {String} url 链接地址
     * @option @param {Array<String>} mentions 提到的人
     * @option @param {String} replyId 回复的消息id
     */
    async doSendLink({ topic, url, mentions, replyId }) {
        let req = await this.sendAndWaitResponse({
            type: 'chat',
            chatId: randText(CHAT_ID_LENGTH),
            topicId: topic.id,
            content: {
                type: 'link',
                text: url,
                mentions,
                replyId,
            },
        })
        return await this.processSendChatRequest(topic, req)
    }
}
// const connection = new Connection()
// export default connection
