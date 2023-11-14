import { BackendApi } from './backend'
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
     * 用户注册
     */
    async logout() {
        const resp = await this.backend.get(`${this.endpoint}/auth/logout`)
        return resp
    }
    /**
     * 用户注册
     */
    async signup(email, password) {
        const resp = await this.backend.post(`${this.endpoint}/auth/register`, { email, password, remember: true })
        return resp
    }
    /**
     * 用户登录
     */
    async login(email, password) {
        const resp = await this.backend.post(`${this.endpoint}/auth/login`, { email, password, remember: true })
        this.authToken = resp.token
        this.myId = email
        return resp
    }

    /**
     * 用token登陆
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

    // 发起加好友的申请
    async removeContact(userId, source, message, memo) {
        return await this.backend.post(`${this.endpoint}/api/contact/remove/${userId}`, { source, message, memo })
    }
    // 发起加好友的申请
    async addFriend(userId, source, message, memo) {
        return await this.backend.post(`${this.endpoint}/api/contact/knock/${userId}`, { source, message, memo })
    }

    // 列出好友申请
    async listFriendApply() {
        const resp = await this.backend.post(`${this.endpoint}/api/contact/list_knock`)
        return resp ?? []
    }

    // 接受好友申请
    async acceptFriendApply(userId, source, message, memo) {
        return await this.backend.post(`${this.endpoint}/api/contact/accept/${userId}`, { source, message, memo })
    }

    // 拒绝好友申请
    async rejectFriendApply(params) {
        return await this.backend.post(`${this.endpoint}/api/contact/reject/${params.userId}`, params)
    }

    // 同步联系人
    async getContacts(updatedAt, limit) {
        return await this.backend.post(`${this.endpoint}/api/contact/sync`, { updatedAt, limit })
    }

    // 设置黑名单
    async setBlocked(userId) {
        const resp = await this.backend.post(`${this.endpoint}/api/contact/block/${userId}`)
        return resp.items ?? []
    }

    // 取消黑名单
    async unsetBlocked(userId) {
        const resp = await this.backend.post(`${this.endpoint}/api/contact/unblock/${userId}`)
        return resp.items ?? []
    }

    // 获取会话列表
    async getChatList(updatedAt, limit) {
        return await this.backend.post(`${this.endpoint}/api/chat/list`, { updatedAt, limit })
    }

    // 移出对话列表
    async removeChat(topicId) {
        return await this.backend.post(`${this.endpoint}/api/chat/remove/${topicId}`)
    }

    // 倒序获取会话详情,同步聊天群（单聊和群聊）的消息
    async getChatLogsDesc(topicId, lastSeq, maxSeq, updatedAt, limit) {
        return await this.backend.post(`${this.endpoint}/api/chat/sync/${topicId}`, { lastSeq, maxSeq, updatedAt, limit })
    }

    /**
     * 获取单个聊天会话的信息
     * @param {String} topicId
     * */
    async getTopic(topicId) {
        return await this.backend.post(`${this.endpoint}/api/topic/info/${topicId}`)
    }

    // 同步聊天群的成员信息
    async syncGroupMembers(topicId, updatedAt, limit) {
        return await this.backend.post(`${this.endpoint}/api/topic/members/${topicId}`, { updatedAt, limit })
    }

    // 创建群聊
    async createGroup(name, icon, members) {
        const resp = await this.backend.post(`${this.endpoint}/api/topic/create`, { name, icon, members })
        return resp.items ?? []
    }

    // 申请加入群聊
    async joinGroup(topicId, source, message, memo) {
        const resp = await this.backend.post(`${this.endpoint}/api/topic/knock/${topicId}`, { source, message, memo })
        return resp.items ?? []
    }

    // 获取群聊申请列表,这个没有调用
    async getGroupApplyList(params) {
        const resp = await this.backend.post(`${this.endpoint}/api/topic/admin/list_knock/${params}`)
        return resp ?? []
    }
    //获取入群申请列表
    async getAllGroupApplyList(params) {
        const resp = await this.backend.post(`${this.endpoint}/api/topic/admin/list_knock_all/`)
        return resp ?? []
    }
    // 接收进群申请
    async acceptGroup(params) {
        const resp = await this.backend.post(`${this.endpoint}/api/topic/admin/knock/accept/${params.topicId}/${params.userId}`, params)
        return resp ?? []
    }

    // 解散群聊
    async dismissGroup(topicId) {
        const resp = await this.backend.post(`${this.endpoint}/api/topic/dismiss/${topicId}`, { topicId })
        return resp.items ?? []
    }

    // 更新公告
    async updateGroupNotice(topicId, text) {
        const resp = await this.backend.post(`${this.endpoint}/api/topic/admin/notice/${topicId}`, { text })
        return resp.items ?? []
    }

    // 查看个人信息
    async getUserInfo(userId) {
        try {
            return await this.backend.post(`${this.endpoint}/api/profile/${userId}`)
        } catch (error) {
            return new User(userId)
        }
    }

    // 禁言整个群,如果duration为0则解除禁言
    async silentGroup(topicId, duration) {
        return await this.backend.post(`${this.endpoint}/api/topic/admin/silent_topic/${topicId}`, { duration })
    }

    // 禁言群成员,如果duration为0则解除禁言
    async silentGroupMember(topicId, userId, duration) {
        return await this.backend.post(`${this.endpoint}/api/topic/admin/silent/${topicId}/${userId}`, { duration })
    }

    // 移除某个群成员
    async removeGroupMember(topicId, userId) {
        return await this.backend.post(`${this.endpoint}/api/topic/admin/kickout/${topicId}/${userId}`)

    }
}
