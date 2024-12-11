import { BackendApi, handleResult } from './backend'
import { User } from './types'

export default class ServicesApi {
    constructor(endpoint) {
        this.myId = undefined
        this.authToken = undefined
        this.endpoint = endpoint || ''
    }

    get backend() {
        return new BackendApi(this.authToken)
    }
    /**
     * User logout
     */
    async logout() {
        const resp = await this.backend.get(`${this.endpoint}/auth/logout`)
        return resp
    }
    /**
     * User registration
     */
    async signup(email, password, remember=true) {
        const resp = await this.backend.post(`${this.endpoint}/auth/register`, { email, password, remember})
        return resp
    }

    async guestLogin(guestId, remember=true) {
        const resp = await this.backend.post(`${this.endpoint}/auth/guest/login`, { guestId, remember})
        this.authToken = resp.token
        this.myId = guestId
        return resp
    }
    /**
     * User login
     */
    async login(email, password, remember=true) {
        const resp = await this.backend.post(`${this.endpoint}/auth/login`, { email, password, remember })
        this.authToken = resp.token
        this.myId = email
        return resp
    }

    /**
     * Login with token
     */
    async loginWithToken(email, token) {
        const resp = await this.backend.post(`${this.endpoint}/auth/login`, { email, token, remember: true })
        this.authToken = resp.token
        this.myId = email
        return resp
    }

    async chatWithUser(userId) {
        const resp = await this.backend.post(`${this.endpoint}/api/topic/create/${userId}`)
        return resp
    }
    // Set blacklist
    async setBlocked(userId) {
        const resp = await this.backend.post(`${this.endpoint}/api/block/${userId}`)
        return resp.items ?? []
    }

    // Remove from blacklist
    async unsetBlocked(userId) {
        const resp = await this.backend.post(`${this.endpoint}/api/unblock/${userId}`)
        return resp.items ?? []
    }

    // Get chat list
    async getChatList(updatedAt, limit) {
        return await this.backend.post(`${this.endpoint}/api/chat/list`, { updatedAt, limit })
    }

    // Remove from chat list
    async removeChat(topicId) {
        return await this.backend.post(`${this.endpoint}/api/chat/remove/${topicId}`)
    }

    // Get chat logs in descending order, sync messages in chat conversations (single and group chat)
    async getChatLogsDesc(topicId, lastSeq, maxSeq, updatedAt, limit) {
        return await this.backend.post(`${this.endpoint}/api/chat/sync/${topicId}`, { lastSeq, maxSeq, updatedAt, limit })
    }

    /**
     * Get information of a single chat session
     * @param {String} topicId
     * */
    async getTopic(topicId) {
        return await this.backend.post(`${this.endpoint}/api/topic/info/${topicId}`)
    }

    // Sync topic members information
    async syncTopicMembers(topicId, updatedAt, limit) {
        return await this.backend.post(`${this.endpoint}/api/topic/members/${topicId}`, { updatedAt, limit })
    }

    // Create topic chat
    async createTopic(name, icon, members) {
        const resp = await this.backend.post(`${this.endpoint}/api/topic/create`, { name, icon, members })
        return resp.items ?? []
    }

    // Apply to join topic chat
    async joinTopic(topicId, source, message, memo) {
        const resp = await this.backend.post(`${this.endpoint}/api/topic/knock/${topicId}`, { source, message, memo })
        return resp.items ?? []
    }

    // Get topic application list, this is not called
    async getTopicApplyList(params) {
        const resp = await this.backend.post(`${this.endpoint}/api/topic/admin/list_knock/${params}`)
        return resp ?? []
    }
    // Get all topic chat application list
    async getAllTopicApplyList(params) {
        const resp = await this.backend.post(`${this.endpoint}/api/topic/admin/list_knock_all/`)
        return resp ?? []
    }
    // Accept topic chat application
    async acceptTopic(params) {
        const resp = await this.backend.post(`${this.endpoint}/api/topic/admin/knock/accept/${params.topicId}/${params.userId}`, params)
        return resp ?? []
    }

    // Dismiss topic chat
    async dismissTopic(topicId) {
        const resp = await this.backend.post(`${this.endpoint}/api/topic/dismiss/${topicId}`, { topicId })
        return resp.items ?? []
    }

    // Update topic notice
    async updateTopicNotice(topicId, text) {
        const resp = await this.backend.post(`${this.endpoint}/api/topic/admin/notice/${topicId}`, { text })
        return resp.items ?? []
    }

    // View personal information
    async getUserInfo(userId) {
        try {
            return await this.backend.post(`${this.endpoint}/api/profile/${userId}`)
        } catch (error) {
            return new User(userId)
        }
    }

    // Mute the entire topic, if duration is 0 then unmute
    async silentTopic(topicId, duration) {
        return await this.backend.post(`${this.endpoint}/api/topic/admin/silent_topic/${topicId}`, { duration })
    }

    // Mute topic member, if duration is 0 then unmute
    async silentTopicMember(topicId, userId, duration) {
        return await this.backend.post(`${this.endpoint}/api/topic/admin/silent/${topicId}/${userId}`, { duration })
    }

    // Remove a topic member
    async removeTopicMember(topicId, userId) {
        return await this.backend.post(`${this.endpoint}/api/topic/admin/kickout/${topicId}/${userId}`)

    }
    // Allow a user to chat with me
    async allowChatWithUser(userId) {
        return await this.backend.post(`${this.endpoint}/api/relation/${userId}`, { 'chatAllowed': true })
    }

    // Upload file
    async uploadFile(file, topicId, isPrivate) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('topicId', topicId)
        formData.append('private', isPrivate)

        const authToken = this.backend.token ? `Bearer ${this.backend.token}` : undefined
        const resp = await fetch(`${this.endpoint}/api/attachment/upload`, {
            method: 'POST',
            credentials: 'same-origin',
            body: formData,
            headers: new Headers({
                'Authorization': authToken,
            }),
        })

        return await handleResult(resp)
    }
}
