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
    processIncoming(topic, logItem) {
        topic.lastSeq = logItem.seq > topic.lastSeq ? logItem.seq : topic.lastSeq
        if (!logItem.content || logItem.unreadable) {
            return
        }
        if (logItem.seq == 0 || !logItem.chatId) {
            return
        }
        let conversation = Conversation.fromTopic(topic, logItem).build(this)        
        /*
        TODO: port this code
         if let Some(content) = req.content.as_ref() {
        match ContentType::from(content.content_type.clone()) {
            ContentType::None | ContentType::Recall => {}
            ContentType::TopicJoin => {
                conversation.last_message_at = req.created_at.clone();
                conversation.is_partial = true; // force fetch conversation
            }
            ContentType::TopicChangeOwner => {
                conversation.topic_owner_id = Some(req.attendee.clone());
            }
            ContentType::ConversationUpdate => {
                match serde_json::from_str::<ConversationUpdateFields>(&content.text) {
                    Ok(fields) => {
                        conversation.updated_at = req.created_at.clone();
                        if fields.extra.is_some() {
                            conversation.extra = fields.extra;
                        }
                        if fields.tags.is_some() {
                            conversation.tags = fields.tags;
                        }
                        if fields.remark.is_some() {
                            conversation.remark = fields.remark;
                        }
                        conversation.sticky = fields.sticky.unwrap_or(conversation.sticky);
                        conversation.mute = fields.mute.unwrap_or(conversation.mute);
                    }
                    Err(_) => {}
                }
            }
            ContentType::ConversationRemoved => {
                t.remove("", &conversation.topic_id).await.ok();
                return None;
            }
            ContentType::TopicUpdate => {
                match serde_json::from_str::<crate::models::Topic>(&content.text) {
                    Ok(topic) => {
                        conversation.name = topic.name;
                        conversation.icon = topic.icon;
                        conversation.topic_extra = topic.extra;
                    }
                    Err(_) => {}
                }
            }
            ContentType::UpdateExtra => {
                //TODO: ugly code, need refactor, need a last_message_chat_id field in Conversation
                if let Some(lastlog_seq) = conversation.last_message_seq {
                    let log_t = message_storage.table::<ChatLog>().await;
                    if let Some(log_in_store) = log_t.get(&req.topic_id, &content.text).await {
                        if lastlog_seq == log_in_store.seq {
                            if let Some(last_message_content) = conversation.last_message.as_mut() {
                                last_message_content.extra = content.extra.clone();
                            }
                        }
                    }
                }
            }
            _ => {
                if req.seq > conversation.last_read_seq
                    && !content.unreadable
                    && !req.chat_id.is_empty()
                {
                    conversation.unread += 1;
                }
            }
        }
    }
    if req.seq >= conversation.last_seq {
        conversation.last_seq = req.seq;

        let unreadable = req.content.as_ref().map(|v| v.unreadable).unwrap_or(false);
        if !unreadable && !req.chat_id.is_empty() {
            conversation.last_sender_id = req.attendee.clone();
            conversation.last_message_at = req.created_at.clone();
            conversation.last_message = req.content.clone();
            conversation.last_message_seq = Some(req.seq);
            conversation.updated_at = req.created_at.clone();
        }
    }

    if has_read {
        conversation.last_read_at = Some(req.created_at.clone());
        conversation.last_read_seq = conversation.last_seq;
        conversation.unread = 0;
    }

    conversation.cached_at = now_millis();
    t.set("", &conversation.topic_id, Some(&conversation))
        .await
        .ok();
    Some(conversation)
    */

        this.getMessageStore(topic.id).updateMessages([logItem])
        return conversation
    }
}
