import { Client } from './src/client.js'
import { Conversation, ChatLog } from './src/types.js'
import { createRsClient } from './src/main.js'
import Alpine from 'alpinejs'

const endpoint = 'https://chat.ruzhila.cn'

class LogItem {
    /**
     * @param {string} text
     * @param {string} time
     * */
    constructor(text, time) {
        this.text = text
        this.time = time
    }
}

class DemoApp {
    constructor() {
        /** @type {Client} */
        this.client = undefined
        /** @type {LogItem[]} */
        this.logs = []
        /** @type {Conversation[]} */
        this.conversations = []
        /** @type {ChatLog[]} */
        this.messages = []
        /** @type {Map<string, Number>} */
        this.messageIds = {}
        /** @type {Conversation} */
        this.current = undefined
        this.textMessage = ''
        this.lastTyping = 0
    }

    init() {
        this.logit('init app')
    }
    clearLogs() {
        this.logs = []
    }
    logit() {
        let text = Array.from(arguments).map((arg) => {
            if (typeof arg === 'object') {
                return JSON.stringify(arg)
            } else {
                return arg
            }
        }).join(' ')

        this.logs.push(new LogItem(text, new Date().toLocaleTimeString()))
    }

    shutdown() {
        if (this.client) {
            this.client.shutdown()
            this.client = undefined
        }
        this.conversations = []
    }
    async startApp(username) {
        this.shutdown()

        const client = createRsClient(endpoint)
        let authInfo = undefined
        try {
            if (!username) {
                this.logit('start app with', 'guest-demo')
                authInfo = await client.guestLogin({ guestId: 'guest-demo' })
            } else {
                authInfo = await client.login({ username, password: `${username}:demo` })
            }
        } catch (e) {
            this.logit('login failed', e)
            return
        }
        this.logit('current user is ', authInfo.firstName || authInfo.username || authInfo.email)
        this.buildClient(client)
        await client.connect()
    }
    /**
    * @param {Client} client 
    */
    buildClient(client) {
        this.lastTyping = 0
        this.client = client
        client.onConnected = this.onConnected.bind(this)
        client.onDisconnected = this.onDisconnected.bind(this)
        client.onConversationUpdated = this.onConversationUpdated.bind(this)
        client.onConversationRemoved = this.onConversationRemoved.bind(this)
        client.onTopicMessage = this.onTopicMessage.bind(this)
        client.onTyping = this.onTyping.bind(this)
    }
    onConnected() {
        this.logit('connected', this.client.myId)
        this.client.beginSyncConversations()
    }
    onDisconnected() {
        this.logit('disconnected', client.myId)
    }

    onConversationUpdated(conversation) {
        this.logit('conversation updated', conversation.id, 'lastSeq:', conversation.lastSeq, 'unread:', conversation.unread)
        let idx = this.conversations.findIndex((c) => c.topicId === conversation.topicId)
        if (idx >= 0) {
            this.conversations[idx] = conversation
        } else {
            this.conversations.push(conversation)
        }
        this.conversations.sort((a, b) => a.compareSort(b))
        if (this.current && conversation.topicId === this.current.topicId) {
            const lastSeq = this.current.lastSeq
            const newLastSeq = Math.max(conversation.lastSeq, lastSeq)
            const limit = newLastSeq - lastSeq
            this.current = conversation
            this.fetchLastLogs({ topicId: conversation.topicId, lastSeq: newLastSeq, limit }).then()
        }
    }
    onConversationRemoved(topicId) {
        this.logit('conversation removed', topicId)
        let idx = this.conversations.findIndex((c) => c.topicId === topicId)
        if (idx >= 0) {
            this.conversations.splice(idx, 1)
        }
        if (this.current && this.current.topicId === topicId) {
            this.current = undefined
            this.messages = []
        }
    }
    /**
     * @param {Topic} topic
     * @param {ChatLog} message
     */
    onTopicMessage(topic, message) {
        let hasRead = this.current && this.current.topicId === topic.id
        if (hasRead && message.readable) {
            this.current.typing = false
        }
        return { code: 200, hasRead }
    }

    onTyping(topicId, senderId) {
        console.log('typing', topicId, this.current.topicId)
        if (this.current && this.current.topicId === topicId) {
            let conversation = this.current
            conversation.typing = true
            setTimeout(() => {
                conversation.typing = false
            }, 5000)
        }
    }
    doTyping(e) {
        if (!this.current || !this.client || e.target.value.length < 1) {
            return
        }
        let now = new Date().getTime()
        if (now - this.lastTyping < 5000) {
            return
        }
        this.lastTyping = now
        this.client.doTyping(this.current.topicId)
    }
    async sendMessage() {
        const text = this.textMessage
        if (!text) {
            return
        }
        if (!this.current) {
            this.logit('no current conversation')
            return
        }
        await this.client.doSendText({ topicId: this.current.topicId, text })
        this.textMessage = ''
        this.lastTyping = 0
    }
    /**
     * @param {Conversation} conversation
     * */
    async chatWith(conversation) {
        this.messages = [] // clear chat logs
        this.messageIds = {}
        this.lastTyping = 0
        this.current = conversation
        this.client.setConversationRead(conversation.topicId)
        this.current.unread = 0
        await this.fetchLastLogs({ topicId: conversation.topicId })
    }

    async fetchLastLogs({ topicId, lastSeq, limit }) {
        const { logs, hasMore } = await this.client.syncChatlogs({ topicId, lastSeq, limit })
        if (logs) {
            logs.forEach((log) => {
                if (!log.chatId) {
                    return
                }
                if (this.messageIds[log.chatId] === undefined) {
                    this.messages.push(log)
                    this.messageIds[log.chatId] = this.messages.length - 1
                } else {
                    let idx = this.messageIds[log.chatId]
                    this.messages[idx].extra = log.extra
                }
            })
            this.messages.sort((a, b) => a.compareSort(b))
        }
        // scroll to bottom 
        // TODO: check the scroll position and only scroll to bottom if it is already at the bottom        
        const chatbox = document.getElementById('chatbox')
        let scrollToEnd = chatbox.scrollTop + chatbox.clientHeight + 100 >= chatbox.scrollHeight
        if (scrollToEnd) {
            setTimeout(() => {
                chatbox.scrollTop = chatbox.scrollHeight
            }, 100)
        }
    }

    async onScrollMessages(event) {
        if (event.target.scrollTop > 0) {
            return
        }
        if (!this.current) {
            return
        }
        event.preventDefault()
        let firstSeq = undefined
        // sync older messages
        if (this.messages && this.messages[0].seq > this.current.startSeq) {
            firstSeq = this.messages[0].seq
        }
        firstSeq = Math.max(firstSeq, this.current.startSeq)
        await this.fetchLastLogs({ topicId: this.current.topicId, lastSeq: firstSeq })
    }

    renderLog(item) {
        switch (item.content.type) {
            case 'text':
                return `<div>${item.content.text}</div>`
            case 'logs':
                return `<div><a href="${item.content.text}" target="_blank"</a>${item.content.placeholder} size(${item.content.size})</div>`
            case 'image':
                return `<div><img class="w-32 h-32" src="${item.content.text}"></div>`
            case 'file':
                const filename = item.content.placeholder || item.content.text.split('/').pop()
                return `<div><a href="${item.content.text}" target="_blank">${filename} size(${item.content.size})</a></div>`
            default:
                return `<div><span>[${item.content.type}]</span>${item.content.placeholder || item.content.text}</div>`
        }
    }

    async doSendFiles(event) {
        if (!this.current) {
            return
        }
        const topicId = this.current.topicId
        let file = event.target.files[0]
        let result = await this.client.uploadFile({ topicId, file, isPrivate: false })
        if (file.type.startsWith('image/')) {
            await this.client.doSendImage({ topicId, urlOrData: result.path })
        } else {
            await this.client.doSendFile({ topicId, urlOrData: result.path, filename: result.fileName, size: result.size })
        }
    }
}

window.demoapp = new DemoApp()
window.Alpine = Alpine
Alpine.start()