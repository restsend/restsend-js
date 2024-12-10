import { User, Topic, ChatLog, TopicNotice, Conversation } from './types'
import { LRUCache } from 'lru-cache'
import { formatDate } from './utils'

const MessageBucketSize = 100
class MessageStore {
    constructor(services, topicId, bucketSize) {
        this.services = services
        this.bucketSize = bucketSize || MessageBucketSize
        this.topicId = topicId
        this.messages = []
        this.localLastSeq = 0
        this.remoteLastSeq = 0
        this.lastSync = undefined
    }
    // Get messages in reverse order, starting from seq and looking for limit messages
    async getMessages(seq) {
        let resp = await this.getMessagesFromCache(seq)
        if (resp) {
            return resp
        }

        // First get from local cache
        let limit = this.bucketSize
        let startSeq = seq - limit
        let endSeq = seq
        if (startSeq <= 0) {
            startSeq = 0
        }

        resp = await this.services.getChatLogsDesc(this.topicId, startSeq, endSeq, undefined, limit)
        let items = resp.items || []
        let hasMore = items.length > 0 && items[0].seq > 1

        let logs = []
        for (let i = 0; i < items.length; i++) {
            let log = Object.assign(new ChatLog(), items[i])
            log.sender = await this.getUser(log.senderId)

            log.createdAt = formatDate(log.createdAt || Date.now())
            log.updatedAt = formatDate(log.createdAt || Date.now())
            logs.push(log)
        }
        this.updateMessages(logs)
        return { logs, hasMore }
    }

    getMessagesFromCache(seq) {
        if (this.messages.length <= 0) {
            return
        }
        let idx = this.messages.findIndex(m => m.seq == seq)
        if (idx === -1) {
            return
        }

        let startPos = idx - this.bucketSize - 1
        let endPos = idx + 1
        if (startPos < 0) {
            startPos = 0
        }

        let logs = this.messages.slice(startPos, endPos)
        if (logs.length <= 0) {
            return
        }

        let hasMore = logs.length > 0 && logs[0].seq > 1
        if (logs.length < this.bucketSize) {
            if (logs[0].seq > 1) {
                return
            }
        }
        return { logs, hasMore }
    }

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
        this.messages.sort((a, b) => a.seq - b.seq)
    }
}
export class ClientStore {
    constructor(services) {
        this.services = services
        this.users = new LRUCache({ max: 20000 }) // Cache 20000 users
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

    async getUser(userId, maxAge=1000*60) { // 1 minute
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

    async getTopic(topicId, maxAge=1000*60) { // 1 minute
        let topic = this.topics[topicId]
        if (topic && maxAge > 0) {
            if (Date.now() - topic.cachedAt < maxAge) { 
                return topic
            }
        }
        return await this.updateTopic(topicId, topic)
    }

    async updateTopic(topicId, topic) {
        topic = Object.assign(new Topic(), await this.services.getTopic(topicId))

        topic.isOwner = topic.owner === this.services.myId
        topic.isAdmin = topic.admins?.indexOf(this.services.myId) !== -1
        topic.owner = await this.getUser(topic.ownerId)
        topic.cachedAt = Date.now()
        if (topic.notice) {
            topic.notice = Object.assign(new TopicNotice(), topic.notice)
            topic.notice.updatedAt = formatDate(topic.notice.updatedAt || Date.now())
        }
        this.topics[topicId] = topic
        return topic
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
        if (!logItem.content || logItem.unreadable) {
            return
        }
        if (logItem.seq == 0 || !logItem.chatId) {
            return
        }
        const content = logItem.content
        let conversation = Conversation.fromTopic(topic, logItem).build(this)
        switch (content.type) {
            case '':
            case 'recall':
                break
            case 'topic.join':
                conversation.lastMessageAt = logItem.createdAt
                conversation.isPartial = true
                break
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
                return
            case 'topic.update':
                const topicData = JSON.parse(content.text)
                conversation.name = topicData.name || conversation.name
                conversation.icon = topicData.icon || conversation.icon
                conversation.topicExtra = topicData.extra || conversation.topicExtra
                break
            case 'update.extra':
                if (conversation.lastMessageSeq == logItem.seq) {
                    conversation.lastMessage.extra = content.extra
                }
                break
        }

        if (logItem.seq >= conversation.lastReadSeq && !logItem.unreadable && !logItem.chatId) {
            conversation.unread += 1
        }
        
        if (logItem.seq >= conversation.lastSeq) {
            conversation.lastSeq = logItem.seq
            conversation.lastSenderId = logItem.senderId
            conversation.lastMessageAt = logItem.createdAt
            conversation.lastMessage = logItem
            conversation.lastMessageSeq = logItem.seq
            conversation.updatedAt = logItem.createdAt
        }

        if (hasRead) {
            conversation.lastReadSeq = logItem.seq
            conversation.lastReadAt = logItem.createdAt
            conversation.unread = 0
        }

        this.getMessageStore(topic.id).updateMessages([logItem])
        this.updateConversation(conversation)
        return conversation
    }
}
