
export class Callback {
    constructor() {
        /**
         * 链接成功
         * */
        this.onConnected = () => { }
        /**
         * 链接中
         * */
        this.onConnecting = () => { }
        /**
         * 链接断开
         * @param {String} reason 断开的原因
         * */
        this.onNetBroken = (reason) => { }
        /**
         * 登陆失败
         * @param {String} reason 失败原因
         * */
        this.onAuthError = (reason) => { }
        /**
         * 被其他客户端踢下线
         * @param {String} reason 被踢下线的原因
         * */
        this.onKickoffByOtherClient = (reason) => { }
        /**
         * 发送消息失败
         * @param {Topic} topic
         * @param {String} chatId
         * @param {Number} code http的状态码
         * */
        this.onSendMessageFail = (topic, chatId, code) => { }
        /**
         * 收到群申请
         * @param {Topic} topic
         * @param {String} message
         * */
        this.onTopicKnock = (topic, message, source) => { }
        /**
         * 收到群申请拒绝，只有申请人会收到
         * @param {Topic} topic
         * @param {String} message
         * */
        this.onTopicKnockReject = (topic, userId, message) => { }
        /**
         * 收到群申请同意，只有申请人会收到
         * @param {Topic} topic
         * */
        this.onTopicJoin = (topic) => { }
        /**
         * 收到Typing
         * @param {Topic} topic
         * @param {String} senderId
         * */
        this.onTyping = (topic, senderId) => { }
        /**
         * 收到聊天消息, 撤回消息也会走这个回调
         * @param {Topic} topic
         * @param {ChatLog} message
         * */
        this.onTopicMessage = (topic, message) => { }
        /**
         * 收到群公告更新
         * @param {Topic} topic
         * @param {TopicNotice} notice
         * */
        this.onTopicNoticeUpdated = (topic, notice) => { }
        /**
         * 群成员更新
         * @param {Topic} topic
         * @param {TopicMember} member
         * @param {Boolean} isAdd
         */
        this.onTopicMemberUpdated = (topic, member, isAdd) => { }
        /**
         * 会话更新
         * @param {Conversation} conversation
         */
        this.onConversationUpdated = (conversation) => { }
        /**
         * 会话被删除
         * @param {Conversation} conversation
         */
        this.onConversationRemoved = (conversation) => { }
        /**
         * 被踢出群, 每个人都会收到, 去掉本地的缓存
         * @param {Topic} topic
         * @param {User} admin
         * @param {TopicMember} user
         */
        this.onTopicKickoff = (topic, adminId, user) => { }
        /**
         * 群被解散
         * @param {Topic} topic
         * @param {User} user
         */
        this.onTopicDismissed = (topic, user) => {
        }
        /**
         * 群被禁言
         * @param {Topic} topic
         * @param {String} duration 持续的时间，格式是1h,  1m, 1d这样的， 取消就是为空
         */
        this.onTopicSilent = (topic, duration) => { }
        /**
         * 群成员被禁言
         * @param {Topic} topic
         * @param {TopicMember} member
         * @param {String} duration 持续的时间，格式是1h,  1m, 1d这样的， 取消就是为空
         */
        this.onTopicSilentMember = (topic, member, duration) => { }
    }
}