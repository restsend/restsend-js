import { Client } from './src/client.js'
import { Conversation } from './src/types.js'
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
    }

    init() {
        this.logit('init app')
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
        this.client = client
        client.onConnected = () => {
            this.logit('connected', client.myId)
            this.syncConversations().then()
        }
        client.onDisconnected = () => {
            this.logit('disconnected', client.myId)
        }
        client.onConversationUpdated = (conversation) => {
            this.logit('conversation updated', conversation)
        }
        client.onTopicMessage = (topic, message) => {
            this.logit('incoming message', topic, message)
        }
    }
    async syncConversations() {
        this.client.beginSyncConversations()
    }
    /**
     * @param {string} topicId
     * @param {string} message
     * */
    async sendMessage(topicId, message) {
        //await demoapp.client.sendMessage(topic, message)
    }
    /**
     * @param {string} topicId
     * */
    async chatWith(topicId) {
        // pass
    }
}

window.demoapp = new DemoApp()
window.Alpine = Alpine
Alpine.start()