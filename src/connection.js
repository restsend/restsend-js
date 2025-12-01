/**
 * Connection class
 */
import { ChatRequest } from './types'
import { logger, randText } from './utils'
import { Callback } from './callback'
import { WrappedWxSocket } from './wrappedsocket'

const CHAT_ID_LENGTH = 8
const REQUEST_TIMEOUT = 15 // 15 seconds
const keepaliveInterval = 30 * 1000 // 30 seconds
const reconnectInterval = 5 * 1000 // 5 seconds

function createWebSocket(url) {
    if (typeof wx !== 'undefined') {
        return new WrappedWxSocket(url)
    }
    return new WebSocket(url)
}

export class Connection extends Callback {
    constructor(endpoint) {
        super()
        this.newWebSocket = createWebSocket
        this.device = 'web'
        endpoint = endpoint || ''
        this.endpoint = endpoint.replace(/http/, 'ws')
        this.start()
        this.handlers = {
            'nop': this._onNop.bind(this),
            'ping': this._onPing.bind(this),
            'system': this._onSystem.bind(this),
            'resp': this._onResponse.bind(this),
            'kickout': this._onKickout.bind(this),
        }
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

        let url = `${endpoint}/api/connect?device=${this.device}`
        // check is same origin
        if (typeof wx !== 'undefined' || endpoint.indexOf(`://${window.location}`) === -1) {
            url = `${url}&token=${this.token}`
        }

        this.ws = this.newWebSocket(url)

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
            const ping = { type: 'ping', content: { text: new Date().toString() } }
            this.ws.send(JSON.stringify(ping))
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
        req = Object.assign(new ChatRequest(), req)
        req.receivedAt = new Date()
        // Call the subclass's handler function
        this._handleRequest(req).then((code) => {
            if (req.chatId && req.type !== 'resp') {
                this.sendResponse(req.chatId, code || 200)
            }
        })
    }

    /**
     * Handle messages pushed by the server
     */
    async _handleRequest(req) {
        const { topicId, senderId, type } = req
        const handler = this.handlers[type]
        if (handler) {
            await handler(topicId, senderId, req)
        } else {
            logger.warn('unknown message type', req)
            return 501
        }
    }

    async _onNop(topicId, senderId, req) {
        // do nothing
    }
    async _onPing(topicId, senderId, req) {
        this.doSendRequest({
            type: 'resp',
            chatId: req.chatId,
            code: 200,
            content: req.connect,
        }).then(() => { })
    }

    async _onSystem(topicId, senderId, req) {
        this.onSystemMessage(req)
    }

    async _onResponse(topicId, senderId, resp) {
        const w = this.waiting[resp.chatId]
        if (w) {
            delete this.waiting[resp.chatId]
            if (resp.code !== 200) {
                logger.warn('response error', resp)
                w.onfail && w.onfail(resp.chatId, resp)
            } else {
                w.onack && w.onack(resp)
            }
            await w.resolve(resp)
        }
        else {
            logger.warn('no waiting for resp', resp)
        }
    }

    async _onKickout(topicId, senderId, req) {
        this.onKickoffByOtherClient(req.message)
        this.shutdown()
    }

    sendResponse(chatId, code) {
        this.doSendRequest({
            type: 'resp',
            chatId,
            code,
        }).then(() => { })
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

    async sendAndWaitResponse(req, onsent, onack, onfail, retry = true) {
        req = Object.assign(new ChatRequest(), req)
        let logItem = this._addPendingToStore(req) // Cliient.js

        return new Promise((resolve, _) => {
            this.waiting[req.chatId] = {
                req,
                resolve,
                onack,
                onfail,
            }
            if (onsent) {
                onsent(logItem)
            }
            this.doSendRequest(req, retry).then(() => { }).catch((e) => {
                let w = this.waiting[req.chatId]
                if (w) {
                    onfail && onfail(req.chatId, e)
                    delete this.waiting[req.chatId]
                }
            })

            setTimeout(() => {
                let w = this.waiting[req.chatId]
                if (w) {
                    onfail && onfail(req.chatId, new Error('timeout'))
                    delete this.waiting[req.chatId]
                }
            }, REQUEST_TIMEOUT * 1000)
        })
    }

    /**
     * Typing indicator, only for personal chat
     * @param {String} topicId
     */
    async doTyping(topicId) {
        let req = new ChatRequest()
        req.topicId = topicId
        req.type = 'typing'
        return await this.doSendRequest(req, false)
    }

    /**
      * Chat message read
     * @param {Object} params
     * @param {String} params.topicId
     * @param {Number} params.lastSeq
      */
    async doRead({ topicId, lastSeq }) {
        let req = new ChatRequest()
        req.topicId = topicId
        req.type = 'read'
        req.seq = lastSeq
        return await this.doSendRequest(req, false)
    }
    /**
     * Recall a message
     * @param {Object} params
     * @param {String} params.topicId
     * @param {String} params.chatId
     * @param {Function} [params.onsent] Callback function after the message is sent
     * @param {Function} [params.onack]
     * @param {Function} [params.onfail]
     */
    async doRecall({ topicId, chatId, onsent, onack, onfail }) {
        return await this.sendAndWaitResponse({
            type: 'chat',
            topicId,
            chatId: randText(CHAT_ID_LENGTH),
            content: {
                type: 'recall',
                text: chatId,
            }
        }, onsent, onack, onfail)
    }

    /**
     * Send text message
     * @param {Object} params
     * @param {String} params.topicId
     * @param {String} params.text
     * @param {Array<String>} [params.mentions] Mentioned people
     * @param {String} [params.reply] Reply message id
     * @param {Function} [params.onsent] Callback function after the message is sent
     * @param {Function} [params.onack]
     * @param {Function} [params.onfail]
     */
    async doSendText({ topicId, text, mentions, reply, onsent, onack, onfail }) {
        return await this.sendAndWaitResponse({
            type: 'chat',
            chatId: randText(CHAT_ID_LENGTH),
            topicId,
            content: {
                type: 'text',
                text,
                mentions,
                reply,
            },
        }, onsent, onack, onfail)
    }
    /**
     * Send image message
     * @param {Object} params
     * @param {String} params.topicId
     * @param {String} params.urlOrData Image URL or base64 encoded image content
     * @param {Array<String>} [params.mentions] Mentioned people
     * @param {String} [params.reply] Reply message id
     * @param {Number} [params.size] Image size
     * @param {Function} [params.onsent] Callback function after the message is sent
     * @param {Function} [params.onack]
     * @param {Function} [params.onfail]
     */
    async doSendImage({ topicId, urlOrData, size, mentions, reply, onsent, onack, onfail }) {
        return await this.sendAndWaitResponse({
            type: 'chat',
            chatId: randText(CHAT_ID_LENGTH),
            topicId,
            content: {
                type: 'image',
                text: urlOrData,
                size,
                mentions,
                reply,
            },
        }, onsent, onack, onfail)
    }
    /**
     * Send voice message
     * @param {Object} params
     * @param {String} params.topicId
     * @param {String} params.urlOrData
     * @param {String} params.duration Voice duration, format is 00:00
     * @param {Array<String>} [params.mentions] Mentioned people
     * @param {String} [params.reply] Reply message id
     * @param {Function} [params.onsent] Callback function after the message is sent
     * @param {Function} [params.onack]
     * @param {Function} [params.onfail]
     * */
    async doSendVoice({ topicId, urlOrData, duration, mentions, reply, onsent, onack, onfail }) {
        return await this.sendAndWaitResponse({
            type: 'chat',
            chatId: randText(CHAT_ID_LENGTH),
            topicId,
            content: {
                type: 'voice',
                text: urlOrData,
                duration,
                mentions,
                reply,
            },
        }, onsent, onack, onfail)
    }
    /**
     * Send video message
     * @param {Object} params
     * @param {String} params.topicId
     * @param {String} params.urlOrData Video URL
     * @param {String} params.thumbnail Video thumbnail
     * @param {String} params.duration Video duration, format is 00:00
     * @param {Array<String>} [params.mentions] Mentioned people
     * @param {String} [params.reply] Reply message id
     * @param {Function} [params.onsent] Callback function after the message is sent
     * @param {Function} [params.onack]
     * @param {Function} [params.onfail]
     */
    async doSendVideo({ topicId, urlOrData, thumbnail, duration, mentions, reply, onsent, onack, onfail }) {
        return await this.sendAndWaitResponse({
            type: 'chat',
            chatId: randText(CHAT_ID_LENGTH),
            topicId,
            content: {
                type: 'video',
                text: urlOrData,
                thumbnail,
                duration,
                mentions,
                reply,
            },
        }, onsent, onack, onfail)
    }

    /**
     * Send file message
     * @param {Object} params
     * @param {String} params.topicId
     * @param {String} params.urlOrData File URL or base64 encoded file content
     * @param {String} params.filename File name
     * @param {Number} params.size File size
     * @param {Array<String>} [params.mentions] Mentioned people
     * @param {String} [params.reply] Reply message id
     * @param {Function} [params.onsent] Callback function after the message is sent
     * @param {Function} [params.onack]
     * @param {Function} [params.onfail]
     * */
    async doSendFile({ topicId, urlOrData, filename, size, mentions, reply, onsent, onack, onfail }) {
        return await this.sendAndWaitResponse({
            type: 'chat',
            chatId: randText(CHAT_ID_LENGTH),
            topicId,
            content: {
                type: 'file',
                text: urlOrData,
                placeholder: filename,  // File name
                size,
                mentions,
                reply,
            },
        }, onsent, onack, onfail)
    }

    /**
     * Send location message
     * @param {Object} params
     * @param {String} params.topicId
     * @param {Number} params.latitude Latitude
     * @param {Number} params.longitude Longitude
     * @param {String} params.address Address
     * @param {Array<String>} [params.mentions] Mentioned people
     * @param {String} [params.reply] Reply message id
     * @param {Function} [params.onsent] Callback function after the message is sent
     * @param {Function} [params.onack]
     * @param {Function} [params.onfail]
     */
    async doSendLocation({ topicId, latitude, longitude, address, mentions, reply, onsent, onack, onfail }) {
        return await this.sendAndWaitResponse({
            type: 'chat',
            chatId: randText(CHAT_ID_LENGTH),
            topicId,
            content: {
                type: 'file',
                text: `${latitude},${longitude}`,
                placeholder: address,
                mentions,
                reply,
            },
        }, onsent, onack, onfail)
    }

    /**
     * Send link message
     * @param {Object} params
     * @param {String} params.topicId
     * @param {String} params.url Link URL
     * @param {Array<String>} [params.mentions] Mentioned people
     * @param {String} [params.reply] Reply message id
     * @param {Function} [params.onsent] Callback function after the message is sent
     * @param {Function} [params.onack]
     * @param {Function} [params.onfail]
     */
    async doSendLink({ topicId, url, mentions, reply, onsent, onack, onfail }) {
        return await this.sendAndWaitResponse({
            type: 'chat',
            chatId: randText(CHAT_ID_LENGTH),
            topicId,
            content: {
                type: 'link',
                text: url,
                mentions,
                reply,
            },
        }, onsent, onack, onfail)
    }
    /**
    * Send message
    * @param {Object} params
    * @param {String} params.type
    * @param {String} params.topicId
    * @param {String} params.text Message content
    * @param {String} [params.placeholder] Placeholder text
    * @param {Array<String>} [params.mentions] Mentioned people
    * @param {String} [params.reply] Reply message id
    * @param {Function} [params.onsent] Callback function after the message is sent
    * @param {Function} [params.onack]
    * @param {Function} [params.onfail]
    */
    async doSendMessage({ type, topicId, text, placeholder, mentions, reply, onsent, onack, onfail }) {
        return await this.sendAndWaitResponse({
            type: 'chat',
            chatId: randText(CHAT_ID_LENGTH),
            topicId,
            content: {
                type,
                text,
                mentions,
                reply,
                placeholder,
            },
        }, onsent, onack, onfail)
    }
    /**
     * Update sent chat message's extra
     * @param {Object} params
     * @param {String} params.topicId The topic id
     * @param {String} params.chatId The chat id
     * @param {Object} [params.extra] The extra, optional
     * @param {Function} [params.onsent] Callback function after the message is sent
     * @param {Function} [params.onack]
     * @param {Function} [params.onfail]
     */
    async doUpdateExtra({ topicId, chatId, extra, onsent, onack, onfail }) {
        return await this.sendAndWaitResponse({
            type: 'chat',
            chatId: randText(CHAT_ID_LENGTH),
            topicId,
            content: {
                type: 'update.extra',
                text: chatId,
                extra,
            },
        }, onsent, onack, onfail)
    }
}
