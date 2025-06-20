import { formatDate } from './utils'

export const NetworkState = {
    Connected: 'connected',
    Connecting: 'connecting',
    Disconnected: 'disconnected',
}

export const ChatContentType = {
    Null: '',
    Text: 'text',
    Image: 'image',
    Video: 'video',
    Voice: 'voice',
    File: 'file',
    Location: 'location',
    Sticker: 'sticker',
    Contact: 'contact',
    Invite: 'invite',
    Link: 'link',
    Logs: 'logs',
    TopicCreate: 'topic.create',
    TopicDismiss: 'topic.dismiss',
    TopicQuit: 'topic.quit',
    TopicKickout: 'topic.kickout',
    TopicJoin: 'topic.join',
    TopicNotice: 'topic.notice',
    TopicKnock: 'topic.knock',
    TopicKnockAccept: 'topic.knock.accept',
    TopicKnockReject: 'topic.knock.reject',
    TopicSilent: 'topic.silent',
    TopicSilentMember: 'topic.silent.member',
    TopicChangeOwner: 'topic.changeowner',
    UploadFile: 'file.upload',
    ConversationUpdate: 'conversation.update',
    ConversationRemoved: 'conversation.removed',
    UpdateExtra: 'update.extra',
}

export const ChatRequestType = {
    Nop: 'nop',
    Chat: 'chat',
    Ping: 'ping',
    Typing: 'typing',
    Read: 'read',
    Response: 'resp',
    Kickout: 'kickout',
    System: 'system',
}

export const LogStatusSending = 0
export const LogStatusSent = 1
export const LogStatusReceived = 2
export const LogStatusRead = 3
export const LogStatusFailed = 4
export class User {
    constructor(id) {
        /**
        * @type {String}
        */
        this.id = id
        /**
         * @type {String}
        */
        this.name = null
        /**
         * @type {String} url address
        */
        this.avatar = null
        /**
         * @type {String} e2e public key
        */
        this.publicKey = null
        /**
         * @type {String} local or contact remark
        */
        this.remark = null
        /**
         * @type {Boolean} is starred
        */
        this.isStar = false
        /**
         * @type {String} language
        */
        this.locale = null
        /**
         * @type {String} city
        */
        this.city = null
        /**
         * @type {String} country
        */
        this.country = null
        /**
         * @type {String} source
        */
        this.source = null
        /**
         * @type {Date} local creation time
        */
        this.createdAt = null
        /**
         * @type {Date} update time
        */
        this.updatedAt = null
        /**
         * @type {Date} cached time
        */
        this.cachedAt = undefined
    }

    get displayName() {
        let name = this.name || this.firstName || this.id
        if (this.remark) {
            name = `${this.remark}(${name})`
        }
        return name
    }
}

export class TopicNotice {
    constructor() {
        /**
         * @type {String} notice content
         */
        this.text = null
        /**
         * @type {String} notice publisher
         * */
        this.publisher = null
        /**
         * @type {Date} publish time
         * */
        this.updatedAt = null
    }
}

export class Topic {
    constructor() {
        /**
         * @type {String} group id
         */
        this.id = null
        /**
         * @type {String} group name
         * */
        this.name = null
        /**
         * @type {String} group avatar
         * */
        this.icon = null
        /**
         * @type {String} remark
         * */
        this.remark = null
        /**
         * @type {String} group owner
         * */
        this.ownerId = null
        /**
         * @type {String} if it's a single chat, it's the other party's id, this field is empty for group chat
         * */
        this.attendeeId = null
        /**
         * @type {Array<String>} group chat administrators
         * */
        this.admins = []
        /**
         * @type {Number} number of group members
         * */
        this.members = 0
        /**
         * @type {Number} last message seq
         * */
        this.lastSeq = 0
        /**
         * @type {Number} last read message seq
         * */
        this.lastReadSeq = 0
        /**
         * @type {Boolean} is group chat
         * */
        this.multiple = false
        /**
         * @type {Boolean} is private group
         *  */
        this.private = false
        /**
         * @type {String} creation time
         * */
        this.createdAt = null
        /**
         * @type {Date} update time
         * */
        this.updatedAt = null
        /**
         * @type {TopicNotice} group notice
         * */
        this.notice = null
        /**
         * @type {Boolean} is muted
         * */
        this.muted = false
        /**
         * @type {Date} cached time
         * */
        this.cachedAt = undefined
    }
}

export class TopicMember {
    constructor() {
        this.topicId = null
        this.userId = null
        this.remark = null // remark in the group
        this.createdAt = null
        this.updatedAt = null
    }
}

export class Content {
    constructor() {
        /**
         * @type {String} content type text, image, video, voice, file, location, link
         */
        this.type = null
        /**
         * @type {Boolean} is encrypted
         * */
        this.encrypted = false
        /**
         * @type {Number} content checksum crc32, used for Text decryption verification
         * */
        this.checksum = 0
        /**
         * @type {String} text content, in markdown format
         * */
        this.text = null
        /**
         * @type {String} placeholder for display, e.g., [image], used in places where placeholders are needed for images, emojis, files, etc.
         * */
        this.placeholder = null
        /**
         * @type {String} thumbnail url
         * */
        this.thumbnail = null
        /**
         * @type {String} duration used in video, audio format: 00:00
        this.duration = null;
        /**
         * @type {Number} content size, used in files, images, videos, audio
         * */
        this.size = 0

        this.width = 0
        this.height = 0
        /**
         * @type {Array<String>} mentioned or specified people
         * */
        this.mentions = []
        /**
         * @type {String} reply message id
         * */
        this.replyId = null

        /**
         * @type {String} reply message content
         * */
        this.replyContent = null

        /**
         * @type {Map} extra data
         * */
        this.extra = null

        /**
         * @type {Boolean} is unreadable
         * */
        this.unreadable = false
    }
}

export class ChatLog {
    constructor() {
        /**
         * @type {Number} sequence number
         */
        this.seq = 0
        /**
         * @type {String} message id, unique in the current session
         * */
        this.chatId = null
        /**
         * @type {String} sender id
         * */
        this.senderId = null
        /**
         * @type {Content} message content
         * */
        this.content = null
        /**
         * @type {String} send time
         * */
        this.createdAt = null
        /**
         * @type {String} update time
         * */
        this.updatedAt = null
        /**
         * @type {Number} message status
         * Sending = 0, Sent = 1,
         * Received = 2,Read = 3,
         * Failed = 4
         * */
        this.status = 0
        /**
         * @type {Boolean} is unread
         * */
        this.read = false
        /**
         * @type {Boolean} is retracted
         */
        this.recall = false
        this.isSentByMe = false
    }
    /**
     * @type {Boolean} is unreadable
     * */
    get readable() {
        return this.content.unreadable !== true &&
            this.content.type !== '' && // type is empty, means it's deleted
            this.content.type !== 'recall' // recall is not readable
    }
    compareSort(other) {
        if (this.seq === other.seq) {
            const lhsDate = formatDate(this.createdAt)
            const rhsDate = formatDate(other.createdAt)
            return lhsDate - rhsDate
        }
        return this.seq - other.seq
    }
}

export class Conversation {
    /**
     * @param {Topic} topic
     * @param {ChatLog} logItem
     * @returns {Conversation}
     */
    static fromTopic(topic, logItem) {
        let obj = Object.assign(new Conversation(), topic)
        obj.topicId = topic.id
        if (logItem && logItem.readable) {
            obj.lastSenderId = logItem.senderId
            obj.lastMessage = logItem.content
            obj.lastMessageAt = logItem.createdAt
            obj.lastMessageSeq = logItem.seq
            if (logItem.seq > obj.lastSeq) {
                obj.lastSeq = logItem.seq
            }
        }
        return obj
    }

    constructor() {
        /**
         * @type {String} session id
         */
        this.topicId = null

        /**
         * @type {String} session owner id (only for single chat)
         * */
        this.attendee = null
        /**
         * @type {String} session owner id
         * */
        this.ownerId = null
        /**
         * @type {Boolean} is group chat
         *  */
        this.multiple = false
        /**
         * @type {Topic} corresponding Topic details
         */
        this.topic = null
        /**
         * @type {String} session name
         * */
        this.name = null
        /**
         * @type {String} session remark
         * */
        this.remark = null
        /**
         * @type {String} session avatar
         * */
        this.icon = null
        /**
         * @type {Boolean} is sticky
         *  */
        this.sticky = false
        /**
         *  @type {Number} unread messages count
         * */
        this.unread = 0
        /**
         * @type {Content} last message
         * */
        this.lastMessage = null
        /**
         * @type {String} last message send time
         * */
        this.lastMessageAt = null
        this.lastMessageSeq = 0
        this.lastSenderId = null
        this.lastReadSeq = 0
        this.lastReadAt = null
        this.lastSeq = 0

        /**
         * @type {Number} the starting sequence number of the conversation
         */
        this.startSeq = 0
        this.updatedAt = null
        /**
         * @type {Boolean} is muted
         */
        this.mute = false

        this.members = 0
        /**
         * @type {Array<String>} tags
         * */
        this.tags = null
        /**
         * @type {Map} extra data
         * */
        this.extra = null
        /**
         * @type {Map} topic's extra data
         * */
        this.topicExtra = null
        /**
         * @type {String} topic owner id
         * */
        this.topicOwnerID = null
        /**
         * @type {Date} cached time
         * */
        this.cachedAt = undefined
    }
    compareSort(other) {
        const lhsDate = formatDate(this.lastMessageAt || this.updatedAt)
        const rhsDate = formatDate(other.lastMessageAt || other.updatedAt)
        //const diff = this.sticky - other.sticky
        // if (diff === 0) {
        return rhsDate - lhsDate
        //}
        //return diff
    }
    /**
     * @param {Client} client
     * @returns {Conversation}
     */
    build(client) {
        this.updatedAt = formatDate(this.updatedAt || this.createdAt)
        if (this.lastSenderId) {
            Object.defineProperty(this.lastMessage, 'sender', {
                get: async () => {
                    return await client.getUser(this.lastSenderId)
                }
            })
        }

        if (!this.multiple && this.attendee) {
            Object.defineProperty(this, 'name', {
                get: async () => {
                    let attendee = await client.getUser(this.attendee)
                    return attendee.displayName
                }
            })
            Object.defineProperty(this, 'icon', {
                get: async () => {
                    let attendee = await client.getUser(this.attendee)
                    return attendee.avatar
                }
            })
        }
        return this
    }
}

export class ChatRequest {
    constructor() {
        /**
         * @type {String} message type
         * */
        this.type = null
        /**
         * @type {Number} response status code
         */
        this.code = 0
        /**
         * @type {String} topicId
         * */
        this.topicId = null
        /**
         * @type {Number} seq
         * */
        this.seq = 0
        /**
         * @type {String} recipient, only filled in when the client sends a single chat message to a contact
         * */
        this.attendee = null
        /**
         * @type {String} sender's user information
         * */
        this.attendeeProfile = null
        /**
         * @type {String} message id
         * */
        this.chatId = null
        /**
         * @type {Content} message content
         * */
        this.content = null
        /**
         * @type {String} encrypted message text, only used by the sender
         * */
        this.e2eContent = null
        /**
         * @type {String} prompt message, used to replace non-text, image, video, audio, file messages in Content, generally used in system messages
         * */
        this.message = null
        this.receivedAt = undefined
    }
}


export class OnMessageResponse {
    constructor() {
        /**
         * @type {Boolean} is read
         * */
        this.hasRead = false
        /**
         * @type {int} response code
         * */
        this.code = 200
    }
}
export class ConversationUpdateFields {
    constructor() {
        /**
         * @type {Boolean} sticky
         */
        this.sticky = false
        /**
         * @type {Boolean} mute
         */
        this.mute = false
        /**
         * @type {Array<String>} remark
         */
        this.tags = []
        /**
         * @type {Map} extra
         */
        this.extra = null

        /**
         * @type {String} remark
         */
        this.remark = null
    }
}
export class UploadResult {
    constructor() {
        /**
         * @type {Boolean} external is external file
         */
        this.external = false
        /**
         * @type {String} path, full url address
         */
        this.path = null
        /**
         * @type {String} fileName
         */
        this.fileName = null
        /**
         * @type {String} ext
         */
        this.ext = null
        /**
         * @type {int} size
         */
        this.size = 0
    }
}