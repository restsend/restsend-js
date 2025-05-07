import { createApis, IAllApi } from "./api";
import { Callback } from "./callback";
import { IClient } from "./iclient";
import { Connection } from "./network/connection";
import {
  FileMessageParams,
  GenericMessageParams,
  ImageMessageParams,
  IMessageService,
  ReadMessageParams,
  RecallMessageParams,
  TextMessageParams,
  VideoMessageParams,
  VoiceMessageParams,
} from "./network/imessage_service";
import { MessageService } from "./network/message_service";

import { IClientStore } from "./store";
import { createStore } from "./store/main";
import { ChatLog, ChatRequest, User } from "./types";
import { formatDate, logger } from "./utils";

export class Client implements IClient, IMessageService {
  private apis: IAllApi;
  private store: IClientStore;
  private callback?: Callback;

  private connection: Connection;

  private messageService: IMessageService;

  constructor(endpoint: string, callback: Callback) {
    if (endpoint && endpoint.endsWith("/")) {
      endpoint = endpoint.slice(0, -1);
    }
    this.apis = createApis(endpoint);
    this.store = createStore(this.apis);
    this.callback = callback;
    this.connection = new Connection(endpoint, this.apis, this.store, callback);

    this.messageService = new MessageService(this.connection, this.store, this.apis);

    this._initHandlers();
  }


  _initHandlers() {
    this.connection.handlers.chat = async (
      topicId: string,
      _senderId: string,
      req: ChatRequest
    ) => {
      let topic = await this.store.getTopic(topicId);
      if (!topic) {
        // bad topic id
        logger.warn("bad topic id", topicId);
        return;
      }
      if (req.attendeeProfile) {
        this.store.updateUser(req.attendee || "", req.attendeeProfile);
      }

      let logItem = Object.assign(new ChatLog(), req) as ChatLog;
      logItem.senderId = req.attendee || "";

      Object.defineProperty(logItem, "sender", {
        get: async () => {
          return (await this.store.getUser(req.attendee || "")) || req.attendeeProfile;
        },
      });

      logItem.createdAt = formatDate(req.createdAt);
      logItem.updatedAt = formatDate(req.createdAt);

      const { code, hasRead } = this.callback?.onTopicMessage?.(topic, logItem) || {};
      if (hasRead) {
        this.messageService.doRead({ topicId, lastSeq: logItem.seq }).then();
      }
      let conversation = this.store.processIncoming(topic, logItem, hasRead || false);
      if (conversation) {
        this.callback?.onConversationUpdated?.(conversation);
      } else if (logItem.content?.type === "conversation.removed") {
        this.callback?.onConversationRemoved?.(topicId);
      }
      return code;
    };
  }

  /**
   * Start syncing conversation list
   */
  beginSyncConversations(limit: number = 100) {
    let count = 0;

    let syncAt = this.store.getLastSyncConversation();
    const conversations = this.store.getConversations();
    for (let id in conversations) {
      this.callback?.onConversationUpdated?.(conversations[id]);
    }

    let doSync = async () => {
      let { items, updatedAt, hasMore } = await this.apis.chat.getChatList(syncAt, limit || 100);

      if (!items) {
        return;
      }
      for (let idx = 0; idx < items.length; idx++) {
        const lastMessageSeq = items[idx].lastMessageSeq || items[idx].lastSeq;
        let unread = lastMessageSeq - items[idx].lastReadSeq;
        if (unread < 0) {
          unread = 0;
        }
        items[idx].unread = unread;
        let conversation = await Object.assign({}, items[idx]);

        // buildConversation(conversation) TODO: 需要实现

        conversation.topic = await this.store.getTopic(conversation.topicId);
        this.store.updateConversation(conversation);
        this.callback?.onConversationUpdated?.(conversation);
      }
      count += items.length;
      syncAt = updatedAt;
      if (hasMore) {
        await doSync();
      }
    };
    doSync().then(() => {
      this.store.setLastSyncConversation(syncAt);
      logger.debug("sync conversations done count:", count);
    });
  }

  /**
   * Sync chat logs
   * @param {String} topicId
   * @param {Number} lastSeq
   * @param {Number} limit
   * @returns {Object} { logs, hasMore }
   * */
  async syncChatlogs(
    topicId: string,
    lastSeq: number,
    limit: number
  ): Promise<{ logs: ChatLog[]; hasMore: boolean }> {
    let conversation = await this.store.getConversation(topicId);
    if (!conversation) {
      throw new Error("conversation not found");
    }
    let msgStore = this.store.getMessageStore(conversation.topicId);
    return await msgStore.getMessages(lastSeq || conversation.lastSeq, limit);
  }

  connect(): void {
    this.connection.connect();
  }

  shutdown() {
    this.connection.shutdown();
  }

  guestLogin(guestId: string,remember?:boolean,extra?:Record<string,any>): Promise<User> {
    return this.apis.auth.guestLogin(guestId,remember,extra);
  }

  login(username: string, password: string): Promise<User> {
    return this.apis.auth.login(username, password);
  }

  loginWithToken(username: string, token: string): Promise<User> {
    return this.apis.auth.loginWithToken(username, token);
  }

  getMyId(): string {
    return this.apis.auth.getMyId();
  }

  getAuthToken(): string {
    return this.apis.auth.getAuthToken();
  }

  getApis() {
    return this.apis;
  }

  getStore() {
    return this.store;
  }

  getConnection() {
    return this.connection;
  }

  getMessageService() {
    return this.messageService;
  }

  //----------------- 消息服务接口实现 -----------------

  doSend(params: GenericMessageParams): Promise<void> {
    return this.messageService.doSend(params);
  }


  doTyping(topicId: string): Promise<void> {
    return this.messageService.doTyping(topicId);
  }
  doRead({ topicId, lastSeq }: ReadMessageParams): Promise<void> {
    return this.messageService.doRead({ topicId, lastSeq });
  }

  async doSendText(params: TextMessageParams): Promise<void> {
    await this.messageService.doSendText(params);
  }
  async doSendImage(params: ImageMessageParams): Promise<void> {
    await this.messageService.doSendImage(params);
  }
  async doSendVoice(params: VoiceMessageParams): Promise<void> {
    await this.messageService.doSendVoice(params);
  }
  async doSendVideo(params: VideoMessageParams): Promise<void> {
    await this.messageService.doSendVideo(params);
  }
  async doSendFile(params: FileMessageParams): Promise<void> {
    await this.messageService.doSendFile(params);
  }
  async doRecall(params: RecallMessageParams): Promise<void> {
    await this.messageService.doRecall(params);
  }
  async deleteMessage(topicId: string, chatId: string): Promise<void> {
    return this.messageService.deleteMessage(topicId, chatId);
  }
  //----------------- 消息服务接口实现 -----------------
}

export function createRsClient(endpoint: string, callback: Callback) {
  return new Client(endpoint, callback);
}
