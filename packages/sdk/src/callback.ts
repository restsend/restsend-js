import {
  ChatLog,
  ChatRequest,
  Conversation,
  OnMessageResponse,
  Topic,
  TopicMember,
  TopicNotice,
  User,
} from "./types";

export interface Callback {
  /**
   * Connection successful
   * */
  onConnected: () => void;

  /**
   * Connecting
   * */
  onConnecting: () => void;

  /**
   * Connection broken
   * @param {String} reason Reason for disconnection
   * */
  onNetBroken: (reason: string) => void;

  /**
   * Login failed
   * @param {String} reason Reason for failure
   * */
  onAuthError: (reason: string) => void;

  /**
   * Kicked offline by another client
   * @param {String} reason Reason for being kicked offline
   * */
  onKickoffByOtherClient: (reason: string) => void;

  /**
   * Message sending failed
   * @param {Topic} topic
   * @param {String} chatId
   * @param {Number} code HTTP status code
   * */
  onSendMessageFail: (topic: Topic, chatId: string, code: number) => void;

  /**
   * Received group application
   * @param {Topic} topic
   * @param {String} message
   * */
  onTopicKnock: (topic: Topic, message: string, source?: any) => void;

  /**
   * Group application rejected, only the applicant will receive this
   * @param {Topic} topic
   * @param {String} message
   * */
  onTopicKnockReject: (topic: Topic, userId: string, message: string) => void;

  /**
   * Group application approved, only the applicant will receive this
   * @param {Topic} topic
   * */
  onTopicJoin: (topic: Topic) => void;

  /**
   * Received Typing
   * @param {string} topicId
   * @param {String} senderId
   * */
  onTyping: (topicId: string, senderId: string) => void;

  /**
   * Received chat message, retracted messages will also trigger this callback
   * @param {Topic} topic
   * @param {ChatLog} message
   * @returns {OnMessageResponse} Return true to stop the message from being processed
   * */
  onTopicMessage: (topic: Topic, message: ChatLog) => OnMessageResponse;

  /**
   * Group announcement updated
   * @param {Topic} topic
   * @param {TopicNotice} notice
   * */
  onTopicNoticeUpdated: (topic: Topic, notice: TopicNotice) => void;

  /**
   * Group member updated
   * @param {Topic} topic
   * @param {TopicMember} member
   * @param {Boolean} isAdd
   */
  onTopicMemberUpdated: (topic: Topic, member: TopicMember, isAdd: boolean) => void;

  /**
   * Conversation updated
   * @param {Conversation} conversation
   */
  onConversationUpdated: (conversation: Conversation) => void;

  /**
   * Conversation removed
   * @param {String} conversaionId
   */
  onConversationRemoved: (conversaionId: string) => void;

  /**
   * Kicked out of the group, everyone will receive this, remove local cache
   * @param {Topic} topic
   * @param {User} admin
   * @param {TopicMember} user
   */
  onTopicKickoff: (topic: Topic, adminId: string, user: TopicMember) => void;

  /**
   * Group dismissed
   * @param {Topic} topic
   * @param {User} user
   */
  onTopicDismissed: (topic: Topic, user: User) => void;

  /**
   * Group silenced
   * @param {Topic} topic
   * @param {String} duration Duration, format is 1h, 1m, 1d, etc., empty for cancel
   */
  onTopicSilent: (topic: Topic, duration: string) => void;

  /**
   * Group member silenced
   * @param {Topic} topic
   * @param {TopicMember} member
   * @param {String} duration Duration, format is 1h, 1m, 1d, etc., empty for cancel
   */
  onTopicSilentMember: (topic: Topic, member: TopicMember, duration: string) => void;

  /**
   * System message
   * @param {ChatRequest} req System message
   */
  onSystemMessage: (req: ChatRequest) => void;
}
