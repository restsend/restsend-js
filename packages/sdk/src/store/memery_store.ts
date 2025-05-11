import { IAllApi } from "../api";
import { LogStatusReceived } from "../constants";
import { ChatLog } from "../types";
import { formatDate, compareChatLogs } from "../utils";
import { IMessageStore, MessageBucketSize } from "./interfaces";


export class MessageStore implements IMessageStore {
    apis: IAllApi;
    bucketSize: number;
    topicId: string;
    messages: ChatLog[];
    lastSync?: number;
    _hasMore: boolean = false;

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
     * 从远程服务器获取消息
     * @param {number} lastSeq 最后消息序号
     * @param {number} limit 限制数量
     * @returns {Promise<{logs: ChatLog[], hasMore: boolean}>}
     */
    async fetchMessagesFromServer(
      lastSeq: number,
      limit: number
    ): Promise<{ logs: ChatLog[]; hasMore: boolean }> {
      const resp = await this.apis.chat.getChatLogsDesc(
        this.topicId,
        lastSeq,
        limit || this.bucketSize
      );
      
      // 确保 resp 和 resp.items 都存在
      const items = (resp && resp.items) || [];
      const hasMore = !!(resp && resp.hasMore);
      
      const logs: ChatLog[] = [];
  
      for (let i = 0; i < items.length; i++) {
        let log = Object.assign(new ChatLog(), items[i]);
        // 确保有有效的 chatId，优先级: 1. 现有 chatId 2. id 3. 基于 seq 生成
        log.chatId = log.chatId || log.id || `msg_${log.seq}`;
        // 保持 id 字段与 chatId 一致 (如果存在 id 属性)
        if ('id' in log) {
          log.id = log.chatId;
        }
        log.isSentByMe = log.senderId === this.apis.auth.getMyId();
        log.createdAt = formatDate(log.createdAt || Date.now());
        log.updatedAt = log.createdAt;
        log.status = log.status || LogStatusReceived;
        logs.push(log);
      }
      
      return { logs, hasMore };
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
      
      // 从服务器获取消息
      const { logs: serverLogs, hasMore } = await this.fetchMessagesFromServer(lastSeq, limit);
      
      // 更新内存中的消息
      this.updateMessages(serverLogs);

      this._hasMore = hasMore;
      
      return { logs: serverLogs, hasMore };
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

    hasMore(): boolean {
      return this._hasMore;
    }
}
  