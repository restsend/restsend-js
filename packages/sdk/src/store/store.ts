import { User, Topic, ChatLog, Conversation, Content, ConversationUpdateFields } from "../types";
import { formatDate } from "../utils";
import { compareChatLogs, conversationFromTopic } from "../utils/type_tools";
import { LogStatusReceived, LogStatusSending, LogStatusSent } from "../constants";
import { IMessageStore, IClientStore, MessageBucketSize } from "./interfaces";
import { IAllApi } from "../api";

const MAX_RECALL_SECS = 60 * 2;

export class MessageStore implements IMessageStore {
  apis: IAllApi;
  bucketSize: number;
  topicId: string;
  messages: ChatLog[];
  lastSync?: number;

  /**
   * @param {apisApi} apis
   * @param {String} topicId
   * @param {Number} bucketSize
   * */
  constructor(apis: IAllApi, topicId: string, bucketSize: number) {
    this.apis = apis;
    this.bucketSize = bucketSize || MessageBucketSize;
    this.topicId = topicId;
    this.messages = [];
    this.lastSync = undefined;
  }
  /**
   * Get messages in reverse order, starting from seq and looking for limit messages
   * @param {Number} lastSeq
   * @returns {Promise<{ logs: ChatLog[], hasMore: Boolean }>}     *
   *  */
  async getMessages(
    lastSeq: number,
    limit: number
  ): Promise<{ logs: ChatLog[]; hasMore: boolean }> {
    let logs = this.getMessagesFromCache(lastSeq, limit);
    if (logs) {
      logs.forEach((log) => {
        switch (log.content?.type) {
          case "update.extra":
          case "recall":
            let oldLog = this.messages.find((m) => m.chatId == log.content?.text);
            if (oldLog) {
              logs!.push(oldLog);
            }
        }
      });
      return { logs, hasMore: false };
    }
    const resp = await this.apis.chat.getChatLogsDesc(
      this.topicId,
      lastSeq,
      limit || this.bucketSize
    );
    // 确保 resp 和 resp.items 都存在
    const items = (resp && resp.items) || [];
    const hasMore = !!(resp && resp.hasMore);
    
    logs = [];

    for (let i = 0; i < items.length; i++) {
      let log = Object.assign(new ChatLog(), items[i]);
      // 确保有有效的 chatId，优先级: 1. 现有 chatId 2. id 3. 基于 seq 生成
      log.chatId = log.chatId || log.id || `msg_${log.seq}`;
      // 保持 id 字段与 chatId 一致 (如果存在 id 属性)
      if ('id' in log) {
        log.id = log.chatId;
      }
      // TODO: 需要优化
      // Object.defineProperty(log, 'sender', {
      //     get: async () => {
      //         return await this.getUser(log.senderId)
      //     }
      // })
      log.isSentByMe = log.senderId === this.apis.auth.getMyId();
      log.createdAt = formatDate(log.createdAt || Date.now());
      log.updatedAt = log.createdAt;
      log.status = log.status || LogStatusReceived;
      logs.push(log);
    }
    this.updateMessages(logs);
    return { logs, hasMore };
  }

  getMessagesFromCache(lastSeq: number, limit = 100) {
    if (this.messages.length <= 0) {
      return;
    }
    let idx = this.messages.findIndex((m) => m.seq == lastSeq);
    if (idx === -1) {
      return;
    }
    let startIdx = idx - limit + 1;
    if (startIdx < 0) {
      return;
    }
    let logs = this.messages.slice(startIdx, startIdx + limit);
    if (!logs || logs.length < limit || logs.length == 0) {
      return;
    }
    const startSeq = logs[logs.length - 1].seq;
    const endSeq = logs[0].seq;
    const queryDiff = endSeq - startSeq;
    if (queryDiff > limit) {
      return;
    }
    return logs;
  }
  /**
   * Update messages
   * @param {ChatLog[]} items
   * */
  updateMessages(items: ChatLog[]) {
    for (let i = 0; i < items.length; i++) {
      let log = items[i];
      let idx = this.messages.findIndex((m) => m.chatId == log.chatId);
      if (idx !== -1) {
        this.messages[idx] = log;
        continue;
      }
      this.messages.push(log);
    }
    this.messages.sort(compareChatLogs);
  }
  clearMessages() {
    this.messages = [];
  }
  deleteMessage(chatId: string) {
    let idx = this.messages.findIndex((m) => m.chatId == chatId);
    if (idx !== -1) {
      this.messages.splice(idx, 1);
    }
  }
  /**
   * Get message by chat id
   * @param {String} chatId
   * @returns {ChatLog}
   * */
  getMessageByChatId(chatId: string) {
    return this.messages.find((m) => m.chatId == chatId);
  }
}

export class ClientStore implements IClientStore {
  apis: IAllApi;
  users: Record<string, User>;
  conversations: Record<string, Conversation>;
  topics: Record<string, Topic>;
  topicMessageStoree: Record<string, IMessageStore>;
  lastSyncConversation?: Date;

  /**
   * @param {apisApi} apis
   */
  constructor(apis: IAllApi) {
    this.apis = apis;
    this.users = {};
    this.conversations = {};
    this.topics = {};
    this.topicMessageStoree = {};
  }

  /**
   * Get message store for topic
   * @param {String} topicId
   * @param {Number} bucketSize, default 100
   * @returns {MessageStore}
   */
  getMessageStore(topicId: string, bucketSize: number = 100) {
    let store = this.topicMessageStoree[topicId];
    if (store) {
      return store;
    }
    store = new MessageStore(this.apis, topicId, bucketSize);
    this.topicMessageStoree[topicId] = store;
    return store;
  }

  async getUser(userId: string, maxAge = 1000 * 60) {
    // 1 minute
    let user = this.users[userId];
    if (user && maxAge > 0) {
      if (Date.now() - user.cachedAt < maxAge) {
        return user;
      }
      return user;
    }
    let info = await this.apis.user.getUserInfo(userId);
    user = this.updateUser(userId, info as User);

    return user;
  }

  async getTopic(topicId: string, maxAge = 1000 * 60) {
    // 1 minute
    let topic = this.topics[topicId];
    if (topic && maxAge > 0) {
      if (Date.now() - topic.cachedAt < maxAge) {
        return topic;
      }
    }

    topic = Object.assign({}, await this.apis.topic.getTopic(topicId));
    topic.isOwner = topic.ownerId === this.apis.auth.getMyId();
    topic.isAdmin = topic.admins?.indexOf(this.apis.auth.getMyId()) !== -1;
    Object.defineProperty(topic, "owner", {
      get: async () => {
        return await this.getUser(topic.ownerId || "");
      },
    });

    topic.cachedAt = Date.now();
    if (topic.notice) {
      topic.notice = Object.assign({}, topic.notice);
      topic.notice!.updatedAt = formatDate(topic.notice!.updatedAt);
    }
    this.topics[topicId] = topic;
    return topic;
  }

  /**
   * Get conversation by topic id
   * @param {String} topicId
   * @param {Number} maxAge
   * @returns {Conversation}
   */
  async getConversation(topicId: string, maxAge = 1000 * 60) {
    let conversation = this.conversations[topicId];
    if (conversation && maxAge > 0) {
      if (Date.now() - conversation.cachedAt < maxAge) {
        return conversation;
      }
    }
    conversation = Object.assign({}, await this.apis.chat.getConversation(topicId));
    conversation.isOwner = conversation.ownerId === this.apis.auth.getMyId();
    Object.defineProperty(conversation, "owner", {
      get: async () => {
        return await this.getUser(conversation.ownerId || "");
      },
    });

    conversation.cachedAt = Date.now();
    this.conversations[topicId] = conversation;
    return conversation;
  }

  /**
   * Process incoming chat message
   * @param {Topic} topic
   * @param {ChatLog} logItem
   * @returns {Conversation}
   */
  processIncoming(topic: Topic, logItem: ChatLog, hasRead: boolean) {
    topic.lastSeq = logItem.seq > topic.lastSeq ? logItem.seq : topic.lastSeq;
    if (logItem.seq == 0 || !logItem.chatId) {
      return;
    }

    logItem.isSentByMe = logItem.senderId === this.apis.auth.getMyId();
    this.saveIncomingLog(topic.id, logItem);
    return this.mergeChatLog(topic, logItem, hasRead);
  }

  /**
   * Save incoming chat log
   * @param {String} topicId
   * @param {ChatLog} logItem
   * @param {Boolean} hasRead
   * @returns {void}
   */
  saveIncomingLog(topicId: string, logItem: ChatLog) {
    const store = this.getMessageStore(topicId);
    let oldLog = undefined;
    switch (logItem.content!.type) {
      case "topic.join":
        if (logItem.senderId == this.apis.auth.getMyId()) {
          store.clearMessages();
        }
        break;
      case "recall":
        oldLog = store.getMessageByChatId(logItem.content!.text || "");
        if (oldLog && !oldLog.recall) {
          let now = Date.now();
          let createdAt: Date;
          if (oldLog.createdAt instanceof Date) {
            createdAt = oldLog.createdAt;
          } else {
            createdAt = new Date(oldLog.createdAt);
          }

          if (now - createdAt.getTime() >= 1000 * MAX_RECALL_SECS) {
            break;
          }
          if (oldLog.senderId != logItem.senderId) {
            break;
          }
          oldLog.recall = true;
          oldLog.content = { type: "recalled" } as Content;
        }
        break;
      case "update.extra":
        const extra = logItem.content!.extra;
        const updateChatId = logItem.content!.text;
        oldLog = store.getMessageByChatId(updateChatId || "");
        if (oldLog) {
          oldLog.content!.extra = extra;
        }
        break;
    }
    const pendingLog = store.getMessageByChatId(logItem.chatId);
    if (pendingLog) {
      if (pendingLog.status == LogStatusSending) {
        logItem.status = LogStatusSent;
      }
    } else {
      logItem.status = LogStatusReceived;
    }
    store.updateMessages([logItem]);
  }

  /**
   * Merge chat log into conversation
   * @param {Topic} topic
   * @param {ChatLog} logItem
   * @param {Boolean} hasRead
   * @returns {Conversation}
   */
  mergeChatLog(topic: Topic, logItem: ChatLog, hasRead: boolean) {
    const content = logItem.content;
    const prevConversation = this.conversations[topic.id];
    let conversation = conversationFromTopic(topic, logItem);

    // buildConversation(conversation, this) TODO: 需要优化

    if (prevConversation) {
      conversation.unread = prevConversation.unread;
      conversation.lastReadSeq = prevConversation.lastReadSeq;
      conversation.lastReadAt = prevConversation.lastReadAt;
    }
    switch (content?.type) {
      case "topic.change.owner":
        conversation.ownerId = logItem.senderId;
        break;
      case "conversation.update":
        conversation.updatedAt = logItem.createdAt;

        const fields = JSON.parse(content.text) as ConversationUpdateFields;
        conversation.extra = fields.extra || conversation.extra;
        conversation.tags = fields.tags || conversation.tags;
        conversation.remark = fields.remark || conversation.remark;
        conversation.sticky = fields.sticky || conversation.sticky;
        conversation.mute = fields.mute || conversation.mute;
        break;
      case "conversation.removed":
        this.getMessageStore(topic.id).clearMessages(); // clear messages
        return;
      case "topic.update":
        const topicData = JSON.parse(content.text);
        conversation.name = topicData.name || conversation.name;
        conversation.icon = topicData.icon || conversation.icon;
        conversation.topicExtra = topicData.extra || conversation.topicExtra;
        break;
      case "update.extra":
        if (conversation.lastMessage && conversation.lastMessageSeq == logItem.seq) {
          conversation.lastMessage.extra = content.extra;
        }
        break;
    }

    if (logItem.seq >= conversation.lastReadSeq && logItem.readable && logItem.chatId) {
      conversation.unread += 1;
    }

    if (logItem.seq > conversation.lastSeq) {
      conversation.lastMessage = content;
      conversation.lastSeq = logItem.seq;
      conversation.lastSenderId = logItem.senderId;
      conversation.lastMessageAt = logItem.createdAt;
      conversation.lastMessageSeq = logItem.seq;
      conversation.updatedAt = logItem.createdAt;
    }

    if (hasRead) {
      conversation.lastReadSeq = logItem.seq;
      conversation.lastReadAt = logItem.createdAt;
      conversation.unread = 0;
    }
    this.updateConversation(conversation);

    return conversation;
  }

  updateConversation(conversation: Conversation) {
    this.conversations[conversation.topicId] = conversation;
  }

  updateUser(userId: string, data: User) {
    let user = Object.assign({}, data);
    if (!user.id) {
      user.id = data.userId!;
    }
    user.cachedAt = Date.now();
    this.users[userId] = user;
    return user;
  }

  getLastSyncConversation(): Date | undefined {
    return this.lastSyncConversation;
  }

  getConversations(): Record<string, Conversation> {
    return this.conversations;
  }

  setLastSyncConversation(lastSyncConversation: Date | undefined): void {
    this.lastSyncConversation = lastSyncConversation;
  }
}
