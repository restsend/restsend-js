import ServiceApi from './services'

import { Connection } from './connection'
import { logger } from './utils'
import { ChatLog, Topic, User, Conversation } from './types'
import dayjs from 'dayjs'
import { ClientStore } from './store'

export class Client extends Connection {
    constructor(endpoint) {
        if (endpoint && endpoint.endsWith('/'))
            endpoint = endpoint.slice(0, -1)

        super(endpoint)
        this.services = new ServiceApi(endpoint)
        this.store = new ClientStore(this.services)

        this.handlers = {
            'typing': this._onTyping.bind(this),
            'chat': this._onChat.bind(this),
            'read': this._onRead.bind(this),
            'kickout': this._onKickout.bind(this),
        }
    }

    /**
     * 处理服务器推送的消息
     */
    async handleRequest(req) {
        const { topicId, senderId, type } = req
        const handler = this.handlers[type]
        if (handler) {
            await handler(topicId, senderId, req)
        }
    }

    async _onTyping(topicId, senderId, req) {
        let topic = await this.getTopic(topicId)
        if (!topic) {
            // bad topic id
            return
        }
        this.onTyping(topic, senderId)
    }

    async _onChat(topicId, senderId, req) {
        let topic = await this.getTopic(topicId)
        if (!topic) {
            // bad topic id
            logger.warn('bad topic id', topicId)
            return
        }
        if (req.attendeeProfile) {
            this.store.updateUser(req.attendee, req.attendeeProfile)
        }

        let sender = await this.getUser(req.attendee) || req.attendeeProfile
        let chat_log = Object.assign(new ChatLog(), req)
        chat_log.senderId = req.attendee
        chat_log.sender = sender
        chat_log.createdAt = dayjs(req.createdAt)
        chat_log.updatedAt = dayjs(req.createdAt)

        topic.lastSeq = chat_log.seq > topic.lastSeq ? chat_log.seq : topic.lastSeq

        this.store.updateTopicMessage(topic, chat_log)
        this.onTopicMessage(topic, chat_log)

        let conversation = await Conversation.fromTopic(topic, chat_log).build(this)
        conversation.unread = topic.unread
        this.onConversationUpdated(conversation)
    }

    async _onRead(topicId, senderId, req) {
        let topic = await this.getTopic(topicId)
        if (!topic) {
            // bad topic id
            logger.warn('bad topic id', topicId)
            return
        }

        topic.unread = 0
        let conversation = await Conversation.fromTopic(topic).build(this)
        this.onConversationUpdated(conversation)
    }

    async _onKickout(topicId, senderId, req) {
        this.onKickoffByOtherClient(req.message)
        this.shutdown()
    }

    /**
     * 用户名和密码登录
     * @param {String} username
     * @param {String} password
     * @returns {User}
     */
    async login(username, password) {
        return await this.services.login(username, password)
    }
    async logout() {
        return await this.services.login(username, password)
    }
    /**
     * 采用缓存的token登录
     * @returns {UserInfo}
     */
    async loginWithToken(username, token) {
        if (!token) {
            throw new Error('token not found')
        }

        if (!username) {
            throw new Error('username not found')
        }

        return await this.services.loginWithToken(username, token)
    }

    async logout() {
        await this.services.logout()
    }
    /**
     * 开始同步会话列表
     */
    beginSyncConversations() {
        const limit = 100
        let count = 0

        let syncAt = this.store.lastSyncConversation
        for (let id in this.store.conversations) {
            this.onConversationUpdated(this.store.conversations[id])
        }

        let doSync = async () => {
            let { items, updatedAt, hasMore } = await this.services.getChatList(syncAt, limit)

            if (!items) {
                return
            }

            for (let idx = 0; idx < items.length; idx++) {
                let conversation = await Object.assign(new Conversation(), items[idx]).build(this);
                this.store.updateConversation(conversation)
                count++
                this.onConversationUpdated(conversation)
            }
            syncAt = updatedAt
            if (hasMore) {
                await doSync()
            }
        }
        doSync().then(() => {
            this.store.lastSyncConversation = syncAt
            logger.debug('sync conversations done count:', count)
        })
    }

    /**
     * 获取当前用户的userId， 如果没有登录，返回空
     * @returns {String} 返回用户的userId
     */
    get myId() {
        return this.services.myId || ''
    }
    /**
     * 获取当前用户的token， 如果没有登录，返回空
     */
    get token() {
        return this.services.authToken || ''
    }

    /**
     * 获取群申请的数量
     * @returns {Number}
     */
    get topicsKnockCount() { }
    /**
     * 获取会话的数量
     * @returns {Number}
     */
    get conversationsCount() { }

    /**
     * 发起一个单聊请求
     * @param {User} user
     * @returns {Topic} 返回一个会话信息, 可能会为空, 表示请求失败
     */
    async tryChatWithUser(user) {
        let topic = await this.services.chatWithUser(user.id)
        if (!topic) {
            return
        }
        let conversation = await Conversation.fromTopic(topic).build(this)
        if (!conversation.name && !conversation.multiple) {
            conversation.name = user.displayName
        }
        this.onConversationUpdated(conversation)
        return topic
    }
    /**
     * 获取一个会话的信息
     * @param {String} topicId
     * @returns {Conversation} 返回一个会话信息
     */
    async getConversation(topicId) {
        return await this.services.getTopic(topicId)
    }

    /**
     * 删除一个会话， 这个会同步到服务器
     * @param {String} topicId
     * @throws {Exception} 如果会话不存在，会抛出异常
     */
    async removeConversation(topicId) {
        let resp = await this.services.removeChat(topicId)
        this.onConversationRemoved({ topicId })
        return resp
    }

    /**
     * 置顶或者取消会话
     * @param {String} topicId
     * @param {Boolean} sticky
     * @throws {Exception} 如果会话不存在，会抛出异常
     */
    async setConversationSticky(topicId) { }
    /**
     * 已读一个会话
     * @param {String} topicId
     * @throws {Exception} 如果会话不存在，会抛出异常
     */
    setConversationRead(topicId) {
        let topic = this.store.getTopic(topicId)
        if (!topic) {
            throw new Error('topic not found')
        }
        topic.unread = 0
        this.doRead(topicId)
    }

    /**
     * 获取聊天的详细信息
     * @param {String} topicId
     * @returns {Topic} 聊天的详细信息
     */
    async getTopic(topicId) {
        return await this.store.getTopic(topicId)
    }
    /**
     * 获取群的管理员信息
     * @param {String} topicId
     * @returns {Array<User>} 返回管理员列表
     * */
    async getTopicAdmins(topicId) {
        let topic = await this.getTopic(topicId)
        if (topic) {
            return await Promise.all(topic.admins.map((id) => this.getUser(id)))
        }
    }

    /**
     * 创建一个多人聊天, 至少要3个人才能创建， 可以在服务端进行限制
     * @param {Object} params
     * @param {String} params.name
     * @param {String} params.icon http地址, 需要先在客户端合成头像，如果为空，服务器会自动生成
     * @param {Array<String>} params.members 参与者的id
     * */
    async createTopic({ name, icon, members }) {
        return await this.services.createGroup(name, icon, members)
    }

    /**
     * 同步聊天群的成员信息
     * @param {Object} params
     * @param {String} params.topicId
     * @param {String} params.updatedAt
     * @param {String} params.limit
     * @returns {Array<User>} 返回群成员列表
     * */
    async getTopicMembers({ topicId, updatedAt, limit }) {
        return await this.services.syncGroupMembers(topicId, updatedAt, limit)
    }

    /**
     * 更新群的信息
     * @param {String} topicId
     * @param {String} name
     * @param {String} icon
     * */
    updateTopic(topicId, name, icon) { }
    /**
     * 更新群的公告
     * @param {String} topicId
     * @param {String} text
     * */
    async updateTopicNotice({ topicId, text }) {
        return await this.services.updateGroupNotice(topicId, text)
    }

    /**
     * 禁言整个群, 如果duration为空, 则解除禁言
     * @param {String} topicId
     * @param {String} duration 格式为1h, 1d, 1w, 1m, 1y， 为空就是解除禁言
     * */
    async silentTopic({ topicId, duration }) {
        return await this.services.silentGroup(topicId, duration)
    }

    /**
     * 禁言某个成员, 如果duration为空, 则解除禁言
     * @param {String} topicId
     * @param {String} userId
     * @param {String} duration 格式为1h, 1d, 1w, 1m, 1y， 为空就是解除禁言
     * */
    async silentTopicMember({ topicId, userId, duration }) {
        return await this.services.silentGroupMember(topicId, userId, duration)
    }

    /**
     * 添加管理员
     * @param {String} topicId
     * @param {String} userId
     * */
    addTopicAdmin({ topicId, userId }) { }
    /**
     * 删除管理员
     * @param {String} topicId
     * @param {String} userId
     * */
    removeTopicAdmin({ topicId, userId }) { }
    /**
     * 转让群主
     * @param {String} topicId
     * @param {String} userId
     * */
    transferTopic({ topicId, userId }) { }
    /**
     * 退出群聊,所有者不能退出群聊，只能解散群聊
     * @param {String} topicId
     * */
    quitTopic(topicId) { }
    /**
     * 解散群聊
     * @param {String} topicId
     * */
    async dismissTopic(topicId) {
        return await this.services.dismissGroup(topicId)
    }

    /**
     * 申请加入群聊
     * @param {String} topicId
     * @param {String} source
     * @param {String} message
     * @param {String} memo
     * */
    joinTopic({ topicId, source, message, memo }) {
        return this.services.joinGroup(topicId, source, message, memo)
    }

    /**
     * 同意加入群聊
     * @param {String} topicId
     * @param {String} userId
     * */
    acceptTopicJoin({ topicId, userId }) { }
    /**
     * 拒绝加入群聊，只有管理员能操作
     * @param {String} topicId
     * @param {String} userId
     * @param {String} message 理由
     * */
    declineTopicJoin({ topicId, userId, message }) { }
    /**
     * 邀请加入群聊
     * @param {String} topicId
     * @param {String} userId
     */
    inviteTopicMember({ topicId, userId }) { }
    /**
     * 移除群成员
     * @param {String} topicId
     * @param {String} userId
     * */
    async removeTopicMember({ topicId, userId }) {
        return await this.services.removeGroupMember(topicId, userId)
    }

    /**
     * 设置/取消群免打扰
     * @param {String} topicId
     * @param {Boolean} mute
     * */
    setTopicMute({ topicId, boolean }) { }
    /**
     * 清空聊天记录,是否同步到服务端
     * @param {String} topicId
     * @param {Boolean} sync 是否同步到服务端, 如果是群聊这个参数无效
     * */
    cleanTopicHistory({ topicId, sync }) { }
    /**
     * 删除单条消息, 是否同步到服务端
     * @param {String} topicId
     * @param {String} chatId
     * @param {Boolean} sync 是否同步到服务端, 如果是群聊这个参数无效
     */
    removeMessage({ topicId, chatId, sync }) { }
    /**
     * 删除单条消息, 是否同步到服务端
     * @param {String} topicId
     * @param {Array<String>} chatId 多条消息的id
     * @param {Boolean} sync 是否同步到服务端, 如果是群聊这个参数无效
     */
    removeMessages({ topicId, chatId, sync }) { }

    /**
     * 获取一个用户的详细信息, 用户不存在返回undefined
     * @param {String} userId
     * @return {Array<User>} 用户信息
     **/
    async getUser(userId) {
        return this.store.getUser(userId)
    }


    /**
     * 建群
     * @param userId
     * @param source
     * @param message
     * @param memo
     * @returns {Promise<*>}
     */
    async chatWithUser({ userId, source, message, memo }) {
        return await this.services.chatWithUser(userId, source, message, memo)
    }

    /**
     * 联系人申请列表
     * @param {String}
     * @returns {Array<User>} 联系人列表
     * */
    async getKnocks() {
        return await this.services.listFriendApply()
    }

    /**
     * 设置联系人备注
     * @param {String} userId
     * @param {String} remark
     */
    setUserRemark({ userId, remark }) { }
    /**
     * 设置/取消联系人星标
     * @param {String} userId
     * @param {Boolean} star
     */
    setUserStar({ userId, star }) { }
    /**
     * 设置/取消联系人黑名单
     * @param {String} userId
     * @param {Boolean} block
     * */
    async setUserBlock({ userId, blocked }) {
        if (blocked) {
            return await this.services.setBlocked(userId)
        } else {
            return await this.services.unsetBlocked(userId)
        }
    }

    /**
     * 设置允许聊天
     * @param {String} userId
     * */
    async allowChatWithUser(userId) {
        return await this.services.allowChatWithUser(userId)
    }

    /**
     * 
     * @param {file} file  文件对象
     * @param {String} topicId 是否群聊里面上传的文件
     * @param {Boolean} isPrivate 是否是私有文件
     * @returns 
     */
    async uploadFile({ file, topicId, isPrivate }) {
        return await this.services.uploadFile(file, topicId, isPrivate)
    }
}
