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
        /** @type {ChatLog} */
        this.quoteMessage = undefined
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
    async startApp(username, guestRandom) {
        this.shutdown()

        const client = createRsClient(endpoint)
        let authInfo = undefined
        try {
            if (!username) {
                let guestId = 'guest-demo'
                if (guestRandom) {
                    guestId = `${Math.random().toString(36).substring(2)}-guest-random`
                }
                this.logit('start app with', guestId)
                authInfo = await client.guestLogin({ guestId })
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
        this.quoteMessage = undefined
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

        let reply = undefined
        if (this.quoteMessage) {
            reply = this.quoteMessage.chatId
        }
        let onsent = (req) => {
            this.logit('message sent', req)
        }
        await this.client.doSendText({ topicId: this.current.topicId, text, reply, onsent })

        this.textMessage = ''
        this.lastTyping = 0
        this.quoteMessage = undefined
    }
    /**
     * @param {Conversation} conversation
     * */
    async chatWith(conversation) {
        this.messages = [] // clear chat logs
        this.messageIds = {}
        this.lastTyping = 0
        this.current = conversation
        this.quoteMessage = undefined
        await this.client.setConversationRead(conversation)
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
                    this.messages[idx] = log
                    //update ui
                    let elm = document.getElementById('chat-item-' + log.chatId)
                    if (elm) {
                        elm.innerHTML = this.renderLog(log)
                    }
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
    /**
     * @param {ChatLog} item
     */

    renderLog(item) {
        let content = item.content ? item.content : item;
        let output = '';
        switch (content.type) {
            case 'text':
                let text = content.text;
                if (content.text.length > 512) {
                    text = content.text.substring(0, 512);
                    text += ` ... (more ${content.text.length - 512} bytes)`;
                }
                output = `<div class="w-96 overflow-hidden text-overflow-ellipsis">${text}</div>`;
                break;
            case 'logs':
                output = `<div class="border border-gray-400 rounded-md bg-gray-100 p-3">
                        <a href="${content.text}" target="_blank">
                           <p>${content.placeholder}</p>
                           <p class="mt-1">size:<span class="mx-1">(${content.size})</span>Bytes</p>
                        </a>
                    </div>`;
                break;
            case 'image':
                output = `<div><img class="max-w-40 max-h-40" src="${content.text}"></div>`;
                break;
            case 'file':
                const filename = content.placeholder || content.text.split('/').pop();
                output = `<div><a href="${content.text}" target="_blank">${filename} size(${content.size})</a></div>`;
                break;
            case 'recall':
                item.content.type = '';
                return;
            case 'recalled':
                return `<div><span class="text-gray-400">[Recalled]</span></div>`;
            default:
                output = `<div><span>[${content.type}]</span>${content.placeholder || content.text}</div>`;
                break;
        }

        if (content.reply) {
            if (content.replyContent) {
                const replyOutput = this.renderLog(JSON.parse(content.replyContent))
                output = `<div class="bg-gray-50 text-gray-600 text-sm px-2 py-1 rounded-sm mb-1">${replyOutput}</div>` + output;
            }
            else if (!content.replyContent && !content.senderId) {
                output = `<div class="bg-gray-50 text-gray-600 text-sm px-2 py-1 rounded-sm mb-1">[Recalled]</div>` + output;
            }
        }
        return output;
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
    /**
     * 
     * @param {ChatLog} item 
     */
    async doRecallMessage(item) {
        if (item.content.type === 'recall') {
            return
        }
        let resp = await this.client.doRecall({ topicId: this.current.topicId, chatId: item.chatId })
        if (resp.code !== 200) {
            this.logit('recall failed', resp)
        }
    }
    /**
     * 
     * @param {ChatLog} item 
     */
    async doDeleteMessage(item) {
        item.content.type = ''
        await this.client.deleteMessage({ topicId: this.current.topicId, chatId: item.chatId })
    }
    /**
     * 
     * @param {ChatLog} item 
     */
    async doQuoteMessage(item) {
        this.quoteMessage = item
    }

    // renderQuote() {
    //     if (!this.quoteMessage) {
    //         return ''
    //     }
    //     let content = this.quoteMessage.content
    //     switch (content.type) {
    //         case 'text':
    //             return `${content.text}`
    //         case 'logs':
    //             return `${content.placeholder} size(${content.size})`
    //         case 'image':
    //             return `<img :src="${content.thumbnail}" class="max-w-20 max-h-20"/>`
    //             // return `[image]`
    //         case 'file':
    //             const filename = content.placeholder || content.text.split('/').pop()
    //             return `${filename} size(${content.size})`
    //         default:
    //             return `[${content.type}] ${content.placeholder || content.text}`
    //     }
    // }

    renderQuote() {
        if (!this.quoteMessage) {
            return null;
        }
        let content = this.quoteMessage.content;
        let container = document.createElement('div');

        switch (content.type) {
            case 'text':
                container.textContent = content.text;
                break;
            case 'logs':
                container.textContent = `${content.placeholder} size(${content.size})`;
                break;
            case 'image':
                let img = document.createElement('img');
                img.src = content.thumbnail;
                img.className = 'max-w-20 max-h-20';
                container.appendChild(img);
                break;
            case 'file':
                const filename = content.placeholder || content.text.split('/').pop();
                container.textContent = `${filename} size(${content.size})`;
                break;
            default:
                container.textContent = `[${content.type}] ${content.placeholder || content.text}`;
                break;
        }

        return container.outerHTML;
    }
}

window.demoapp = new DemoApp()
window.Alpine = Alpine
Alpine.start()