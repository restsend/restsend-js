/**
 * Connection class
 */
import { ChatRequest } from './types'
import { logger, randText } from './utils'
import { Callback } from './callback'

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
     * Trigger reconnection immediately after the app switches to the foreground to ensure the connection.
    */
    async appActive() {
        await this.immediateConnectIfNeed()
    }

    /**
     * Reduce reconnection frequency when the app switches to the background.
     */
    appDeactive() { }

    /**
     * Get the websocket connection status
     * @returns {String} Returns the status: connected or disconnected
     */
    get networkState() {
        return this.status
    }

    start() {
        this.running = true // If false, it means it has been closed, do not attempt to reconnect

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
     * Manually create a websocket connection after successful login
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
            this._onResponse(req) // Handle response
            return
        }
        req = Object.assign(new ChatRequest(), req)
        req.receivedAt = Date.now()
        // Call the subclass's handler function
        this.handleRequest(req).then((code) => {
            if (req.chatId)
                this.sendResponse(req.chatId, code || 200)
        })
    }

    sendResponse(chatId, code) {
        this.doSendRequest({
            type: 'resp',
            chatId,
            code,
        }).then(() => { })
    }

    async _onResponse(req) {
        const w = this.waiting[req.chatId]
        if (w) {
            delete this.waiting[req.chatId]
            await w.resolve(w.req)
        }
        else {
            logger.warn('no waiting for resp', req)
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
        return new Promise((resolve, reject) => {
            this.waiting[req.chatId] = {
                req,
                resolve,
                reject,
            }

            this.doSendRequest(req, retry).then(() => { })

            setTimeout(() => {
                if (this.waiting[req.chatId]) {
                    this.waiting[req.chatId].reject(new Error('timeout'))
                    delete this.waiting[req.chatId]
                }
            }, REQUEST_TIMEOUT * 1000)
        })
    }

    async processSendChatRequest(topic, req) {
        return req
    }
    /**
     * Typing indicator, only for personal chat
     * @param {Topic} topic
     */
    async doTyping(topic) {
        let req = new ChatRequest()
        req.topicId = topic.id
        req.type = 'typing'
        return await this.doSendRequest(req, false)
    }

    /**
      * Chat message read
      * @param {Topic} topic
      */
    async doRead(topic) {
        let req = new ChatRequest()
        req.topicId = topic.id
        req.type = 'read'
        return await this.doSendRequest(req, false)
    }

    /**
     * Recall a message
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
     * Send text message
     * @param {Topic} topic
     * @param {String} text
     * @option @param {Array<String>} mentions Mentioned people
     * @option @param {String} replyId Reply message id
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
     * Send image message
     * @param {Topic} topic
     * @param {String} urlOrData Image URL or base64 encoded image content
     * @option @param {Array<String>} mentions Mentioned people
     * @option @param {String} replyId Reply message id
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
     * Send voice message
     * @param {Topic} topic
     * @param {String} urlOrData
     * @param {String} duration Voice duration, format is 00:00
     * @option @param {Array<String>} mentions Mentioned people
     * @option @param {String} replyId Reply message id
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
     * Send video message
     * @param {Topic} topic
     * @param {String} url Video URL
     * @param {String} thumbnail Video thumbnail
     * @param {String} duration Video duration, format is 00:00
     * @option @param {Array<String>} mentions Mentioned people
     * @option @param {String} replyId Reply message id
     */
    async doSendVideo({ topic, urlOrData, thumbnail, duration, mentions, replyId }) {
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
     * Send file message
     * @param {Topic} topic
     * @param {String} urlOrData File URL or base64 encoded file content
     * @param {String} filename File name
     * @param {Number} size File size
     * @option @param {Array<String>} mentions Mentioned people
     * @option @param {String} replyId Reply message id
     * */
    async doSendFile({ topic, urlOrData, filename, size, mentions, replyId }) {
        let req = await this.sendAndWaitResponse({
            type: 'chat',
            chatId: randText(CHAT_ID_LENGTH),
            topicId: topic.id,
            content: {
                type: 'file',
                text: urlOrData,
                placeholder: filename,  // File name
                size,
                mentions,
                replyId,
            },
        })
        return await this.processSendChatRequest(topic, req)
    }

    /**
     * Send location message
     * @param {Topic} topic
     * @param {Number} latitude Latitude
     * @param {Number} longitude Longitude
     * @param {String} address Address
     * @option @param {Array<String>} mentions Mentioned people
     * @option @param {String} replyId Reply message id
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
     * Send link message
     * @param {Topic} topic
     * @param {String} url Link URL
     * @option @param {Array<String>} mentions Mentioned people
     * @option @param {String} replyId Reply message id
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
