import ServiceApi from './services'
import { Connection } from './connection'
import { logger, formatDate } from './utils'
import { ChatLog, Topic, User, Conversation } from './types'
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
            'nop':this._onNop.bind(this),
            'system':this._onSystem.bind(this),
        }
    }

    /**
     * Handle messages pushed by the server
     */
    async _handleRequest(req) {
        const { topicId, senderId, type } = req
        const handler = this.handlers[type]
        if (handler) {
            await handler(topicId, senderId, req)
        }
    }

    async _onNop(topicId, senderId, req) {
        // do nothing
    }

    async _onSystem(topicId, senderId, req) {
        this.onSystemMessage(req)
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
        chat_log.createdAt = formatDate(req.createdAt)
        chat_log.updatedAt = formatDate(req.createdAt)

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
     * Login with username and password
     * @param {String} username
     * @param {String} password
     * @returns {User}
     */
    async login({username, password}) {
        return await this.services.login(username, password)
    }
    async logout() {
        return await this.services.login(username, password)
    }
    /**
     * Login with cached token
     * @returns {UserInfo}
     */
    async loginWithToken({username, token}) {
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
     * Start syncing conversation list
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
     * Get the current user's userId, return empty if not logged in
     * @returns {String} userId
     */
    get myId() {
        return this.services.myId || ''
    }
    /**
     * Get the current user's token, return empty if not logged in
     */
    get token() {
        return this.services.authToken || ''
    }

    /**
     * Get the number of topic applications
     * @returns {Number}
     */
    get topicsKnockCount() { }
    /**
     * Get the number of conversations
     * @returns {Number}
     */
    get conversationsCount() { }

    /**
     * Initiate a one-on-one chat request
     * @param {User} user
     * @returns {Topic} conversation info, may be null if request fails
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
     * Get conversation information
     * @param {String} topicId
     * @returns {Conversation} conversation info
     */
    async getConversation(topicId) {
        return await this.services.getTopic(topicId)
    }

    /**
     * Delete a conversation, this will sync to the server
     * @param {String} topicId
     * @throws {Exception} if the conversation does not exist
     */
    async removeConversation(topicId) {
        let resp = await this.services.removeChat(topicId)
        this.onConversationRemoved({ topicId })
        return resp
    }

    /**
     * Pin or unpin a conversation
     * @param {String} topicId
     * @param {Boolean} sticky
     * @throws {Exception} if the conversation does not exist
     */
    async setConversationSticky(topicId) { }
    /**
     * Mark a conversation as read
     * @param {String} topicId
     * @throws {Exception} if the conversation does not exist
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
     * Get detailed chat information
     * @param {String} topicId
     * @returns {Topic} detailed chat information
     */
    async getTopic(topicId) {
        return await this.store.getTopic(topicId)
    }
    /**
     * Get topic admin information
     * @param {String} topicId
     * @returns {Array<User>} list of admins
     * */
    async getTopicAdmins(topicId) {
        let topic = await this.getTopic(topicId)
        if (topic) {
            return await Promise.all(topic.admins.map((id) => this.getUser(id)))
        }
    }

    /**
     * Create a topic chat, at least 3 people are required, can be restricted on the server
     * @param {Object} params
     * @param {String} params.name
     * @param {String} params.icon http address, needs to be synthesized on the client side, if empty, the server will generate automatically
     * @param {Array<String>} params.members participant ids
     * */
    async createTopic({ name, icon, members }) {
        return await this.services.createTopic(name, icon, members)
    }

    /**
     * Sync topic member information
     * @param {Object} params
     * @param {String} params.topicId
     * @param {String} params.updatedAt
     * @param {String} params.limit
     * @returns {Array<User>} list of topic members
     * */
    async getTopicMembers({ topicId, updatedAt, limit }) {
        return await this.services.syncTopicMembers(topicId, updatedAt, limit)
    }

    /**
     * Update topic information
     * @param {String} topicId
     * @param {String} name
     * @param {String} icon
     * */
    updateTopic(topicId, name, icon) { }
    /**
     * Update topic notice
     * @param {String} topicId
     * @param {String} text
     * */
    async updateTopicNotice({ topicId, text }) {
        return await this.services.updateTopicNotice(topicId, text)
    }

    /**
     * Mute the entire topic, if duration is empty, unmute
     * @param {String} topicId
     * @param {String} duration format is 1h, 1d, 1w, 1m, 1y, empty means unmute
     * */
    async silentTopic({ topicId, duration }) {
        return await this.services.silentTopic(topicId, duration)
    }

    /**
     * Mute a member, if duration is empty, unmute
     * @param {String} topicId
     * @param {String} userId
     * @param {String} duration format is 1h, 1d, 1w, 1m, 1y, empty means unmute
     * */
    async silentTopicMember({ topicId, userId, duration }) {
        return await this.services.silentTopicMember(topicId, userId, duration)
    }

    /**
     * Add an admin
     * @param {String} topicId
     * @param {String} userId
     * */
    addTopicAdmin({ topicId, userId }) { }
    /**
     * Remove an admin
     * @param {String} topicId
     * @param {String} userId
     * */
    removeTopicAdmin({ topicId, userId }) { }
    /**
     * Transfer topic ownership
     * @param {String} topicId
     * @param {String} userId
     * */
    transferTopic({ topicId, userId }) { }
    /**
     * Leave topic chat, owner cannot leave, only disband
     * @param {String} topicId
     * */
    quitTopic(topicId) { }
    /**
     * Disband topic chat
     * @param {String} topicId
     * */
    async dismissTopic(topicId) {
        return await this.services.dismissTopic(topicId)
    }

    /**
     * Apply to join topic chat
     * @param {String} topicId
     * @param {String} source
     * @param {String} message
     * @param {String} memo
     * */
    joinTopic({ topicId, source, message, memo }) {
        return this.services.joinTopic(topicId, source, message, memo)
    }

    /**
     * Accept topic chat join request
     * @param {String} topicId
     * @param {String} userId
     * */
    acceptTopicJoin({ topicId, userId }) { }
    /**
     * Decline topic chat join request, only admins can operate
     * @param {String} topicId
     * @param {String} userId
     * @param {String} message reason
     * */
    declineTopicJoin({ topicId, userId, message }) { }
    /**
     * Invite to join topic chat
     * @param {String} topicId
     * @param {String} userId
     */
    inviteTopicMember({ topicId, userId }) { }
    /**
     * Remove topic member
     * @param {String} topicId
     * @param {String} userId
     * */
    async removeTopicMember({ topicId, userId }) {
        return await this.services.removeTopicMember(topicId, userId)
    }

    /**
     * Set/unset topic do not disturb
     * @param {String} topicId
     * @param {Boolean} mute
     * */
    setTopicMute({ topicId, boolean }) { }
    /**
     * Clear chat history, whether to sync to the server
     * @param {String} topicId
     * @param {Boolean} sync whether to sync to the server, invalid for topic chat
     * */
    cleanTopicHistory({ topicId, sync }) { }
    /**
     * Delete a single message, whether to sync to the server
     * @param {String} topicId
     * @param {String} chatId
     * @param {Boolean} sync whether to sync to the server, invalid for topic chat
     */
    removeMessage({ topicId, chatId, sync }) { }
    /**
     * Delete multiple messages, whether to sync to the server
     * @param {String} topicId
     * @param {Array<String>} chatId multiple message ids
     * @param {Boolean} sync whether to sync to the server, invalid for topic chat
     */
    removeMessages({ topicId, chatId, sync }) { }

    /**
     * Get detailed information of a user, return undefined if user does not exist
     * @param {String} userId
     * @return {Array<User>} user information
     **/
    async getUser(userId) {
        return this.store.getUser(userId)
    }

    /**
     * Create a topic
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
     * Contact application list
     * @param {String}
     * @returns {Array<User>} contact list
     * */
    async getKnocks() {
        return await this.services.listFriendApply()
    }

    /**
     * Set contact remark
     * @param {String} userId
     * @param {String} remark
     */
    setUserRemark({ userId, remark }) { }
    /**
     * Set/unset contact star
     * @param {String} userId
     * @param {Boolean} star
     */
    setUserStar({ userId, star }) { }
    /**
     * Set/unset contact blacklist
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
     * Set allow chat with user
     * @param {String} userId
     * */
    async allowChatWithUser({userId}) {
        return await this.services.allowChatWithUser(userId)
    }

    /**
     * 
     * @param {file} file file object
     * @param {String} topicId whether the file is uploaded in a topic chat
     * @param {Boolean} isPrivate whether it is a private file
     * @returns 
     */
    async uploadFile({ file, topicId, isPrivate }) {
        return await this.services.uploadFile(file, topicId, isPrivate)
    }
}
