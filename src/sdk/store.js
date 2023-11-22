import { User, Topic, ChatLog, TopicNotice } from './types.js'
import { LRUCache } from 'lru-cache'
import dayjs from 'dayjs'
/**
 * Private Browsing 是不存储数据，只放在内存中，关闭浏览器就没了
 *  */
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
    // 获取倒序的消息, 从seq开始往前找limit个
    async getMessages(seq) {
        let resp = await this.getMessagesFromCache(seq)
        if (resp) {
            return resp
        }

        // 优先从本地缓存中获取
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

            log.createdAt = dayjs(log.createdAt || Date.now())
            log.updatedAt = dayjs(log.createdAt || log.createdAt || Date.now())
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
        this.users = new LRUCache({ max: 20000 }) // 缓存20000个用户
        this.conversations = {}
        this.topics = {}
        this.topicMessages = {}
        this.lastSyncConversation = undefined
    }

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

    async getUser(userId) {
        let user = this.users[userId]
        if (user) {
            if (Date.now() - user.cachedAt < 1000 * 60 * 5) { // 5分钟
                return user
            }
            return user
        }
        let info = await this.services.getUserInfo(userId)
        return this.updateUser(userId, info)
    }

    async getTopic(topicId) {
        let topic = this.topics[topicId]
        if (topic) {
            if (Date.now() - topic.cachedAt < 1000 * 60) { // 1分钟内的缓存有效
                return topic
            }
        }

        topic = Object.assign(new Topic(), await this.services.getTopic(topicId))

        topic.isOwner = topic.owner === this.services.myId
        topic.isAdmin = topic.admins?.indexOf(this.services.myId) !== -1
        topic.owner = await this.getUser(topic.ownerId)
        topic.cachedAt = Date.now()
        if (topic.notice) {
            topic.notice = Object.assign(new TopicNotice(), topic.notice)
            topic.notice.updatedAt = dayjs(topic.notice.updatedAt || Date.now())
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

    updateTopicMessage(topic, chatLog) {
        this.getMessageStore(topic.id).updateMessages([chatLog])
    }
}
