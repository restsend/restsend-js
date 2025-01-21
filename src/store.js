import { User, Topic, ChatLog, TopicNotice, Conversation, ConversationUpdateFields, LogStatusSent, LogStatusSending, LogStatusReceived } from './types'
import ServicesApi from './services'
import { formatDate } from './utils'

const MAX_RECALL_SECS = 60 * 2
export const MessageBucketSize = 50
class MessageStore {
    /**
     * @param {ServicesApi} services
     * @param {String} topicId
     * @param {Number} bucketSize
     * */
    constructor(services, topicId, bucketSize) {
        this.services = services
        this.bucketSize = bucketSize || MessageBucketSize
        this.topicId = topicId
        /** @type {ChatLog[]} */
        this.messages = []
        this.lastSync = undefined
    }
    /**
     * Get messages in reverse order, starting from seq and looking for limit messages
     * @param {Number} lastSeq
     * @returns {Promise<{ logs: ChatLog[], hasMore: Boolean }>}     * 
     *  */
    async getMessages(lastSeq, limit) {
        let logs = this.getMessagesFromCache(lastSeq, limit)
        if (logs) {
            return { logs }
        }
        const resp = await this.services.getChatLogsDesc(this.topicId, lastSeq, limit || this.bucketSize)
        let items = resp.items || []
        logs = []

        for (let i = 0; i < items.length; i++) {
            let log = Object.assign(new ChatLog(), items[i])
            log.chatId = log.id
            log.id = undefined
            Object.defineProperty(log, 'sender', {
                get: async () => {
                    return await this.getUser(log.senderId)
                }
            })
            log.isSentByMe = log.senderId === this.services.myId
            log.createdAt = formatDate(log.createdAt || Date.now())
            log.updatedAt = formatDate(log.createdAt || Date.now())
            log.status = LogStatusReceived
            logs.push(log)
        }
        this.updateMessages(logs)
        return { logs, hasMore: resp.hasMore }
    }

    getMessagesFromCache(lastSeq, limit = 100) {
        if (this.messages.length <= 0) {
            return
        }
        let idx = this.messages.findIndex(m => m.seq == lastSeq)
        if (idx === -1) {
            return
        }
        let startIdx = idx - limit + 1
        if (startIdx < 0) {
            return
        }
        let logs = this.messages.slice(startIdx, startIdx + limit)
        if (!logs || logs.length < limit || logs.length == 0) {
            return
        }
        const startSeq = logs[logs.length - 1].seq
        const endSeq = logs[0].seq
        const queryDiff = endSeq - startSeq
        if (queryDiff > limit) {
            return
        }
        return logs
    }
    /**
     * Update messages
     * @param {ChatLog[]} items
     * */
    updateMessages(items) {
        for (let i = 0; i < items.length; i++) {
            let log = items[i]
            let idx = this.messages.findIndex(m => m.chatId == log.chatId)
            if (idx !== -1) {
                this.messages[idx] = log
                continue
            }
            this.messages.push(log)
        }
        this.messages.sort((a, b) => a.compareSort(b))
    }
    clearMessages() {
        this.messages = []
    }
    deleteMessage(chatId) {
        let idx = this.messages.findIndex(m => m.chatId == chatId)
        if (idx !== -1) {
            this.messages.splice(idx, 1)
        }
    }
    /**
     * Get message by chat id
     * @param {String} chatId
     * @returns {ChatLog}
     * */
    getMessageByChatId(chatId) {
        return this.messages.find(m => m.chatId == chatId)
    }
}
export class ClientStore {
    /**
     * @param {ServicesApi} services
     */
    constructor(services) {
        this.services = services
        this.users = {}
        this.conversations = {}
        this.topics = {}
        this.topicMessages = {}
        this.lastSyncConversation = undefined
    }

    /**
     * Get message store for topic
     * @param {String} topicId
     * @param {Number} bucketSize, default 100
     * @returns {MessageStore}
     */
    getMessageStore(topicId, bucketSize) {
        let store = this.topicMessages[topicId]
        if (store) {
            return store
        }
        store = new MessageStore(this.services, topicId, bucketSize)
        store.getUser = this.getUser.bind(this)
        this.topicMessages[topicId] = store
        return store
    }

    async getUser(userId, maxAge = 1000 * 60) { // 1 minute
        let user = this.users[userId]
        if (user && maxAge > 0) {
            if (Date.now() - user.cachedAt < maxAge) {
                return user
            }
            return user
        }
        let info = await this.services.getUserInfo(userId)
        return this.updateUser(userId, info)
    }

    async getTopic(topicId, maxAge = 1000 * 60) { // 1 minute
        let topic = this.topics[topicId]
        if (topic && maxAge > 0) {
            if (Date.now() - topic.cachedAt < maxAge) {
                return topic
            }
        }
        return await this.buildTopic(topicId, topic)
    }

    async buildTopic(topicId, topic) {
        topic = Object.assign(new Topic(), await this.services.getTopic(topicId))
        topic.isOwner = topic.ownerId === this.services.myId
        topic.isAdmin = topic.admins?.indexOf(this.services.myId) !== -1
        Object.defineProperty(topic, 'owner', {
            get: async () => {
                return await this.getUser(topic.ownerId)
            }
        })

        topic.cachedAt = Date.now()
        if (topic.notice) {
            topic.notice = Object.assign(new TopicNotice(), topic.notice)
            topic.notice.updatedAt = formatDate(topic.notice.updatedAt || Date.now())
        }
        this.topics[topicId] = topic
        return topic
    }
    /**
     * Get conversation by topic id
     * @param {String} topicId
     * @param {Number} maxAge
     * @returns {Conversation}
     */
    async getConversation(topicId, maxAge = 1000 * 60) {
        let conversation = this.conversations[topicId]
        if (conversation && maxAge > 0) {
            if (Date.now() - conversation.cachedAt < maxAge) {
                return conversation
            }
        }
        return await this.buildConversation(topicId, conversation)
    }
    /**
     * Build conversation
     * @param {String} topicId
     * @param {Conversation} conversation
     * @returns {Conversation}
     */
    async buildConversation(topicId, conversation) {
        conversation = Object.assign(new Conversation(), await this.services.getConversation(topicId))
        conversation.isOwner = conversation.ownerId === this.services.myId
        Object.defineProperty(conversation, 'owner', {
            get: async () => {
                return await this.getUser(conversation.ownerId)
            }
        })

        conversation.cachedAt = Date.now()
        this.conversations[topicId] = conversation
        return conversation
    }

    updateUser(userId, data) {
        let user = Object.assign(new User(), data)
        if (!user.id) {
            user.id = data.userId
        }
        user.cachedAt = Date.now()
        this.users[userId] = user
        return user
    }

    updateConversation(conversation) {
        this.conversations[conversation.topicId] = conversation
    }

    /**
     * Process incoming chat message
     * @param {Topic} topic
     * @param {ChatLog} logItem
     * @returns {Conversation}
     */
    processIncoming(topic, logItem, hasRead) {
        topic.lastSeq = logItem.seq > topic.lastSeq ? logItem.seq : topic.lastSeq
        if (!logItem.readable) {
            return
        }
        if (logItem.seq == 0 || !logItem.chatId) {
            return
        }

        logItem.isSentByMe = logItem.senderId === this.services.myId
        this.saveIncomingLog(topic.id, logItem)
        return this.mergeChatLog(topic, logItem, hasRead)
    }

    /**
     * Save incoming chat log
     * @param {String} topicId
     * @param {ChatLog} logItem
     * @param {Boolean} hasRead
     * @returns {void}
        */
    saveIncomingLog(topicId, logItem) {
        const store = this.getMessageStore(topicId)
        let oldLog = undefined
        switch (logItem.content.type) {
            case 'topic.join':
                if (logItem.senderId == this.services.myId) {
                    store.clearMessages()
                }
                break
            case 'recall':
                oldLog = store.getMessageByChatId(logItem.content.text)
                if (oldLog && !oldLog.recall) {
                    oldLog.recall = true
                    let now = Date.now()
                    if (now - oldLog.createdAt >= 1000 * MAX_RECALL_SECS) {
                        break
                    }
                    if (oldLog.senderId != logItem.senderId) {
                        break
                    }
                    oldLog.content = { type: '' }
                }
                break
            case 'update.extra':
                const extra = logItem.content.extra
                const updateChatId = logItem.content.text
                oldLog = store.getMessageByChatId(updateChatId)
                if (oldLog) {
                    oldLog.content.extra = extra
                }
                break
        }
        const pendingLog = store.getMessageByChatId(logItem.chatId)
        if (pendingLog) {
            if (pendingLog.status == LogStatusSending) {
                logItem.status = LogStatusSent
            }
        } else {
            logItem.status = LogStatusReceived
        }
        store.updateMessages([logItem])
    }
    /**
     * Merge chat log into conversation
     * @param {Topic} topic
     * @param {ChatLog} logItem
     * @param {Boolean} hasRead
     * @returns {Conversation}
     */
    mergeChatLog(topic, logItem, hasRead) {
        const content = logItem.content
        const prevConversation = this.conversations[topic.id]
        let conversation = Conversation.fromTopic(topic, logItem).build(this)
        if (prevConversation) {
            conversation.unread = prevConversation.unread
            conversation.lastReadSeq = prevConversation.lastReadSeq
            conversation.lastReadAt = prevConversation.last
        }
        switch (content?.type) {
            case 'topic.change.owner':
                conversation.ownerId = logItem.senderId
                break
            case 'conversation.update':
                conversation.updatedAt = logItem.createdAt

                /** @type {ConversationUpdateFields} */
                const fields = JSON.parse(content.text)
                conversation.extra = fields.extra || conversation.extra
                conversation.tags = fields.tags || conversation.tags
                conversation.remark = fields.remark || conversation.remark
                conversation.sticky = fields.sticky || conversation.sticky
                conversation.mute = fields.mute || conversation.mute
                break
            case 'conversation.removed':
                this.getMessageStore(topic.id).clearMessages() // clear messages
                return
            case 'topic.update':
                const topicData = JSON.parse(content.text)
                conversation.name = topicData.name || conversation.name
                conversation.icon = topicData.icon || conversation.icon
                conversation.topicExtra = topicData.extra || conversation.topicExtra
                break
            case 'update.extra':
                if (conversation.lastMessage && conversation.lastMessageSeq == logItem.seq) {
                    conversation.lastMessage.extra = content.extra
                }
                break
        }

        if (logItem.seq >= conversation.lastReadSeq && logItem.readable && logItem.chatId) {
            conversation.unread += 1
        }

        if (logItem.seq > conversation.lastSeq) {
            conversation.lastMessage = content
            conversation.lastSeq = logItem.seq
            conversation.lastSenderId = logItem.senderId
            conversation.lastMessageAt = logItem.createdAt
            conversation.lastMessageSeq = logItem.seq
            conversation.updatedAt = logItem.createdAt
        }

        if (hasRead) {
            conversation.lastReadSeq = logItem.seq
            conversation.lastReadAt = logItem.createdAt
            conversation.unread = 0
        }
        this.updateConversation(conversation)
        return conversation
    }
}
