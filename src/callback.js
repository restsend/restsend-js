import { ChatRequest } from "./types"

export class Callback {
    constructor() {
        /**
         * Connection successful
         * */
        this.onConnected = () => { }
        /**
         * Connecting
         * */
        this.onConnecting = () => { }
        /**
         * Connection broken
         * @param {String} reason Reason for disconnection
         * */
        this.onNetBroken = (reason) => { }
        /**
         * Login failed
         * @param {String} reason Reason for failure
         * */
        this.onAuthError = (reason) => { }
        /**
         * Kicked offline by another client
         * @param {String} reason Reason for being kicked offline
         * */
        this.onKickoffByOtherClient = (reason) => { }
        /**
         * Message sending failed
         * @param {Topic} topic
         * @param {String} chatId
         * @param {Number} code HTTP status code
         * */
        this.onSendMessageFail = (topic, chatId, code) => { }
        /**
         * Received group application
         * @param {Topic} topic
         * @param {String} message
         * */
        this.onTopicKnock = (topic, message, source) => { }
        /**
         * Group application rejected, only the applicant will receive this
         * @param {Topic} topic
         * @param {String} message
         * */
        this.onTopicKnockReject = (topic, userId, message) => { }
        /**
         * Group application approved, only the applicant will receive this
         * @param {Topic} topic
         * */
        this.onTopicJoin = (topic) => { }
        /**
         * Received Typing
         * @param {Topic} topic
         * @param {String} senderId
         * */
        this.onTyping = (topic, senderId) => { }
        /**
         * Received chat message, retracted messages will also trigger this callback
         * @param {Topic} topic
         * @param {ChatLog} message
         * */
        this.onTopicMessage = (topic, message) => { }
        /**
         * Group announcement updated
         * @param {Topic} topic
         * @param {TopicNotice} notice
         * */
        this.onTopicNoticeUpdated = (topic, notice) => { }
        /**
         * Group member updated
         * @param {Topic} topic
         * @param {TopicMember} member
         * @param {Boolean} isAdd
         */
        this.onTopicMemberUpdated = (topic, member, isAdd) => { }
        /**
         * Conversation updated
         * @param {Conversation} conversation
         */
        this.onConversationUpdated = (conversation) => { }
        /**
         * Conversation removed
         * @param {Conversation} conversation
         */
        this.onConversationRemoved = (conversation) => { }
        /**
         * Kicked out of the group, everyone will receive this, remove local cache
         * @param {Topic} topic
         * @param {User} admin
         * @param {TopicMember} user
         */
        this.onTopicKickoff = (topic, adminId, user) => { }
        /**
         * Group dismissed
         * @param {Topic} topic
         * @param {User} user
         */
        this.onTopicDismissed = (topic, user) => {
        }
        /**
         * Group silenced
         * @param {Topic} topic
         * @param {String} duration Duration, format is 1h, 1m, 1d, etc., empty for cancel
         */
        this.onTopicSilent = (topic, duration) => { }
        /**
         * Group member silenced
         * @param {Topic} topic
         * @param {TopicMember} member
         * @param {String} duration Duration, format is 1h, 1m, 1d, etc., empty for cancel
         */
        this.onTopicSilentMember = (topic, member, duration) => { }

        /**
         * System message
         * @param {ChatRequest} req System message
         */
        this.onSystemMessage = (req) => { }
    }
}