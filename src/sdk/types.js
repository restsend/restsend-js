import dayjs from 'dayjs'

export const NetworkState = {
    Connected: 'connected',
    Connecting: 'connecting',
    Disconnected: 'disconnected',
}

export const ChatContentType = {
    Text: 'text',
    Image: 'image',
    Video: 'video',
    Voice: 'voice',
    File: 'file',
    Location: 'location',
    Sticker: 'sticker',
    Contact: 'contact',
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
}

export const ChatRequestType = {
    Nop: 'nop',
    Chat: 'chat',
    Typing: 'typing',
    Read: 'read',
    Response: 'resp',
    Kickout: 'kickout',
}
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
         * @type {String} url 地址
        */
        this.avatar = null
        /**
         * @type {String} e2e的公钥
        */
        this.publicKey = null
        /**
         * @type {String} 本地或者联系人备注
        */
        this.remark = null
        /**
         * @type {Boolean} 是否星标
        */
        this.isStar = false
        /**
         * @type {String} 语言
        */
        this.locale = null
        /**
         * @type {String} 城市
        */
        this.city = null
        /**
         * @type {String} 国家
        */
        this.country = null
        /**
         * @type {String} 来源
        */
        this.source = null
        /**
         * @type {String} 本地创建时间
        */
        this.createdAt = null
        /**
         * @type {String} 修改时间
        */
        this.updatedAt = null
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
         * @type {String} 通知的内容
         */
        this.text = null
        /**
         * @type {String} 通知的发布者
         * */
        this.publisher = null
        /**
         * @type {String} 发布时间
         * */
        this.updatedAt = null
    }
}

export class Topic {
    constructor() {
        /**
         * @type {String} 群id
         */
        this.id = null
        /**
         * @type {String} 群名称
         * */
        this.name = null
        /**
         * @type {String} 群头像
         * */
        this.icon = null
        /**
         * @type {String} 备注¬
         * */
        this.remark = null
        /**
         * @type {String} 群主
         * */
        this.ownerId = null
        /**
         * @type {String} 如果是单聊, 则是对方的id, 多人聊天这个字段为空
         * */
        this.attendeeId = null
        /**
         * @type {Array<String>} 群聊的管理员
         * */
        this.admins = []
        /**
         * @type {Number} 群成员数量
         * */
        this.members = 0
        /**
         * @type {Number} 最后一条消息的seq
         * */
        this.lastSeq = 0
        /**
         * @type {Number} 最后一条已读消息的seq
         * */
        this.lastReadSeq = 0
        /**
         * @type {Boolean} 是否群聊
         * */
        this.multiple = false
        /**
         * @type {Boolean} 是否私密群
         *  */
        this.private = false
        /**
         * @type {String} 创建时间
         * */
        this.createdAt = null
        /**
         * @type {String} 更新时间
         * */
        this.updatedAt = null
        /**
         * @type {TopicNotice} 群公告
         * */
        this.notice = null
        /**
         * @type {Boolean} 是否免打扰
         * */
        this.muted = false
        this.cachedAt = undefined
    }
    /**
     * @type {Number} 未读消息数
    */
    get unread() {
        let count = this.lastSeq - this.lastReadSeq
        if (count < 0) {
            count = 0
        }
        return count
    }
}

export class TopicMember {
    constructor() {
        this.topicId = null
        this.userId = null
        this.remark = null // 在群里面的备注
        this.createdAt = null
        this.updatedAt = null
    }
}

export class Content {
    constructor() {
        /**
         * @type {String} 内容类型 text, image, video, voice, file, location, link
         */
        this.type = null
        /**
         * @type {Boolean} 是否加密
         * */
        this.encrypted = false
        /**
         * @type {Number} 内容的checksum crc32,用来做Text解密的校验
         * */
        this.checksum = 0
        /**
         * @type {String} 文本内容,是markdown格式
         * */
        this.text = null
        /**
         * @type {String} 用于显示的占位符, 例如: [图片],在图片，表情，文件等需要占位符的地方会用到
         * */
        this.placeholder = null
        /**
         * @type {String} 缩略图的url
         * */
        this.thumbnail = null
        /**
         * @type {String} 时长 在视频、音频中使用 格式: 00:00
        this.duration = null;
        /**
         * @type {Number} 内容大小，在文件，图片，视频，音频中使用
         * */
        this.size = 0
        /**
         * @type {Array<String>} 提到的人或者指定的人
         * */
        this.mentions = []
        /**
         * @type {String} 回复的消息id
         * */
        this.replyId = null
    }
}
export class ChatLog {
    constructor() {
        /**
         * @type {Number} 序列号
         */
        this.seq = 0
        /**
         * @type {String} 消息id，在当前会话中唯一
         * */
        this.chatId = null
        /**
         * @type {String} 会话id
         * */
        this.topicId = null
        /**
         * @type {String} 发送者id
         * */
        this.senderId = null
        /**
         * @type {Content} 消息内容
         * */
        this.content = null
        /**
         * @type {String} 发送时间
         * */
        this.createdAt = null
        /**
         * @type {String} 更新时间
         * */
        this.updatedAt = null
        /**
         * @type {Number} 消息状态
         * Sending = 0, Sent = 1,
         * Received = 2,Read = 3,
         * Failed = 4
         * */
        this.status = 0
    }
}

export class Conversation {
    static fromTopic(topic, chat_log) {
        let obj = Object.assign(new Conversation(), topic)
        obj.topicId = topic.id
        if (chat_log) {
            obj.lastSenderId = chat_log.senderId
            obj.lastMessage = {
                text: chat_log.content.text,
                senderId: chat_log.senderId,
            }
        }
        return obj
    }

    constructor() {
        /**
         * @type {String} 会话id
         */
        this.topicId = null
        this.attendee = null
        /**
         * @type {Boolean} 是否群聊
         *  */
        this.multiple = false
        /**
         * @type {Topic} 对应的Topic详细信息
         */
        this.topic = null
        /**
         * @type {String} 会话名称
         * */
        this.name = null
        /**
         * @type {String} 会话头像
         * */
        this.icon = null
        /**
         * @type {Boolean} 是否置顶
         *  */
        this.sticky = false
        /**
         *  @type {Numbers} 未读消息数
         * */
        this.unread = 0
        /**
         * @type {Content} 最后一条消息
         * */
        this.lastMessage = null
        /**
         * @type {String} 最后一条消息的发送时间
         * */
        this.lastMessageAt = null

        this.updatedAt = null
    }

    async build(client) {
        this.updatedAt = dayjs(this.updatedAt || this.createdAt)
        if (this.lastSenderId) {
            this.lastMessage.sender = await client.getUser(this.lastSenderId)
        }

        if (!this.multiple && this.attendee) {
            let attendee = await client.getUser(this.attendee)
            this.name = attendee.displayName
        }
        return this
    }
}

export class ChatRequest {
    constructor() {
        /**
         * @type {String} 消息的类型
         * */
        this.type = null
        /**
         * @type {String} 请求id
         * */
        this.id = null
        /**
         * @type {Number} 响应的状态码
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
         * @type {String} 接受者，只有在客户端给联系人发送单聊消息才会填充这个字段
         * */
        this.attendee = null
        /**
         * @type {String} 发送者的用户信息
         * */
        this.attendeeProfile = null
        /**
         * @type {String} 消息id
         * */
        this.chatId = null
        /**
         * @type {Content} 消息内容
         * */
        this.content = null
        /**
         * @type {String} 加密的消息文本内容，只有发送端才会用这个字段
         * */
        this.e2eContent = null
        /**
         * @type {String} 提示消息，用来替代Content中非文本、图片、视频、音频、文件的消息，一般用在系统消息
         * */
        this.message = null
        this.receivedAt = undefined
    }
}
