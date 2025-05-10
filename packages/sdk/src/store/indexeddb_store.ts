import { ChatLog } from "../types";
import { IAllApi } from "../api";
import { MessageStore } from "./store";
import { compareChatLogs } from "../utils/type_tools";
import { LogStatusReceived } from "../constants";
import { formatDate } from "../utils";

// IndexedDB 数据库名称前缀
const DB_NAME_PREFIX = "im_messages_";
// 消息存储的对象仓库名称
const MESSAGES_STORE_NAME = "messages";
// 数据库版本
const DB_VERSION = 1;

/**
 * 自定义接口用于 IndexedDB 中存储的消息
 */
interface IndexedDBChatLog {
  chatId: string;
  seq: number;
  senderId: string;
  content?: any;
  createdAt: string;
  updatedAt: string;
  status: number;
  isSentByMe: boolean;
  deleted: number; // 使用数字 0/1 代替 boolean，0表示未删除，1表示已删除
}

/**
 * 基于 IndexedDB 的消息存储器，扩展自 MessageStore
 * 支持离线缓存和持久化存储
 */
export class IndexedDBMessageStore extends MessageStore {
  private db: IDBDatabase | null = null;
  private dbName: string;
  private isOpening: boolean = false;
  private pendingOperations: Array<() => void> = [];

  /**
   * 构造函数
   * @param {IAllApi} apis API接口
   * @param {string} topicId 会话ID
   * @param {number} bucketSize 消息分页大小
   */
  constructor(apis: IAllApi, topicId: string, bucketSize: number) {
    super(apis, topicId, bucketSize);
    this.dbName = `${DB_NAME_PREFIX}${topicId}`;
    this.openDatabase();
  }

  /**
   * 打开 IndexedDB 数据库
   * @returns {Promise<IDBDatabase>} 数据库实例
   */
  private openDatabase(): Promise<IDBDatabase> {
    if (this.db) {
      return Promise.resolve(this.db);
    }

    if (this.isOpening) {
      return new Promise((resolve) => {
        this.pendingOperations.push(() => {
          if (this.db) {
            resolve(this.db);
          } else {
            resolve(this.openDatabase());
          }
        });
      });
    }

    this.isOpening = true;

    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        this.isOpening = false;
        reject(new Error("IndexedDB is not supported in this browser"));
        return;
      }

      const request = window.indexedDB.open(this.dbName, DB_VERSION);

      request.onerror = (event) => {
        console.error("Error opening IndexedDB:", event);
        this.isOpening = false;
        reject(new Error("Could not open IndexedDB"));
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        this.isOpening = false;

        // 处理待处理的操作
        while (this.pendingOperations.length > 0) {
          const operation = this.pendingOperations.shift();
          if (operation) operation();
        }

        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 检查对象存储是否已存在
        if (!db.objectStoreNames.contains(MESSAGES_STORE_NAME)) {
          // 创建消息对象存储，使用 chatId 作为键路径
          const objectStore = db.createObjectStore(MESSAGES_STORE_NAME, { keyPath: "chatId" });
          // 创建索引，用于按照 seq 排序
          objectStore.createIndex("seq", "seq", { unique: false });
          // 创建一个索引，用于检查消息是否已被删除
          objectStore.createIndex("deleted", "deleted", { unique: false });
        }
      };
    });
  }

  /**
   * 关闭数据库连接
   */
  private closeDatabase(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * 从 IndexedDB 加载消息到内存
   * @returns {Promise<void>}
   */
  private async loadMessagesFromDB(): Promise<void> {
    try {
      const db = await this.openDatabase();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([MESSAGES_STORE_NAME], "readonly");
        const objectStore = transaction.objectStore(MESSAGES_STORE_NAME);
        const index = objectStore.index("deleted");

        // 获取未被删除的消息（deleted=0）
        const request = index.openCursor(IDBKeyRange.only(0));
        const messages: ChatLog[] = [];

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            const dbMessage = cursor.value as IndexedDBChatLog;

            // 将 IndexedDB 存储的消息转换回 ChatLog 对象
            const chatLog = new ChatLog();
            chatLog.chatId = dbMessage.chatId;
            chatLog.seq = dbMessage.seq;
            chatLog.senderId = dbMessage.senderId;
            chatLog.content = dbMessage.content;
            chatLog.createdAt = formatDate(dbMessage.createdAt);
            chatLog.updatedAt = formatDate(dbMessage.updatedAt);
            chatLog.status = dbMessage.status;
            chatLog.isSentByMe = dbMessage.isSentByMe;

            messages.push(chatLog);
            cursor.continue();
          } else {
            // 加载完成后，按 seq 排序并保存到内存
            this.messages = messages.sort(compareChatLogs);
            resolve();
          }
        };

        request.onerror = (event) => {
          console.error("Error loading messages from IndexedDB:", event);
          reject(new Error("Failed to load messages from IndexedDB"));
        };
      });
    } catch (error) {
      console.error("Error in loadMessagesFromDB:", error);
      // 如果加载失败，确保内存中的消息列表初始化为空数组
      this.messages = [];
    }
  }

  /**
   * 将消息存储到 IndexedDB
   * @param {ChatLog[]} messages 要存储的消息
   * @returns {Promise<void>}
   */
  private async saveMessagesToDb(messages: ChatLog[]): Promise<void> {
    if (!messages || messages.length === 0) return;

    try {
      const db = await this.openDatabase();

      const transaction = db.transaction([MESSAGES_STORE_NAME], "readwrite");
      const objectStore = transaction.objectStore(MESSAGES_STORE_NAME);

      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => {
          console.error("Error saving messages to IndexedDB:", event);
          reject(new Error("Failed to save messages to IndexedDB"));
        };

        // 为每条消息添加 deleted 标志，并确保它们可以被序列化
        for (const message of messages) {
          try {
            // 创建一个新对象，只包含需要的属性，确保可序列化
            const messageToStore: IndexedDBChatLog = {
              chatId: message.chatId || `msg_${message.seq}`, // 确保总是有 chatId
              seq: message.seq,
              senderId: message.senderId,
              content: message.content ? { ...message.content } : undefined,
              createdAt:
                message.createdAt instanceof Date
                  ? message.createdAt.toISOString()
                  : typeof message.createdAt === "string"
                    ? message.createdAt
                    : new Date().toISOString(),
              updatedAt:
                message.updatedAt instanceof Date
                  ? message.updatedAt.toISOString()
                  : typeof message.updatedAt === "string"
                    ? message.updatedAt
                    : new Date().toISOString(),
              status: message.status || LogStatusReceived,
              isSentByMe: message.isSentByMe || false,
              deleted: 0, // 0 表示未删除
            };

            objectStore.put(messageToStore);
          } catch (error) {
            console.error("Error preparing message for IndexedDB:", error, message);
          }
        }
      });
    } catch (error) {
      console.error("Error in saveMessagesToDb:", error);
    }
  }

  /**
   * 从 IndexedDB 中删除消息
   * @param {string} chatId 消息ID
   * @returns {Promise<void>}
   */
  private async deleteMessageFromDb(chatId: string): Promise<void> {
    try {
      const db = await this.openDatabase();

      const transaction = db.transaction([MESSAGES_STORE_NAME], "readwrite");
      const objectStore = transaction.objectStore(MESSAGES_STORE_NAME);

      return new Promise((resolve, reject) => {
        // 先检查消息是否存在
        const getRequest = objectStore.get(chatId);

        getRequest.onsuccess = (event) => {
          const message = (event.target as IDBRequest<IndexedDBChatLog>).result;
          if (message) {
            // 标记消息已删除而不是真正删除它，使用 1 表示已删除
            message.deleted = 1;
            objectStore.put(message);
            resolve();
          } else {
            resolve(); // 消息不存在，也算成功
          }
        };

        getRequest.onerror = (event) => {
          console.error("Error retrieving message for deletion:", event);
          reject(new Error("Failed to retrieve message for deletion"));
        };
      });
    } catch (error) {
      console.error("Error in deleteMessageFromDb:", error);
    }
  }

  /**
   * 从 IndexedDB 中清除所有消息
   * @returns {Promise<void>}
   */
  private async clearMessagesFromDb(): Promise<void> {
    try {
      const db = await this.openDatabase();

      const transaction = db.transaction([MESSAGES_STORE_NAME], "readwrite");
      const objectStore = transaction.objectStore(MESSAGES_STORE_NAME);

      return new Promise((resolve, reject) => {
        const request = objectStore.clear();

        request.onsuccess = () => resolve();
        request.onerror = (event) => {
          console.error("Error clearing messages from IndexedDB:", event);
          reject(new Error("Failed to clear messages from IndexedDB"));
        };
      });
    } catch (error) {
      console.error("Error in clearMessagesFromDb:", error);
    }
  }

  /**
   * 获取消息
   * 如果 IndexedDB 中有缓存，优先使用缓存
   * 否则从服务器获取并缓存
   * @param {number} lastSeq 最后消息序号
   * @param {number} limit 限制数量
   * @returns {Promise<{logs: ChatLog[], hasMore: boolean}>}
   */
  override async getMessages(
    lastSeq: number,
    limit: number
  ): Promise<{ logs: ChatLog[]; hasMore: boolean }> {
    // 如果内存中没有消息，尝试从 IndexedDB 加载
    if (this.messages.length === 0) {
      await this.loadMessagesFromDB();
    }

    return await super.getMessages(lastSeq, limit);
  }

  /**
   * 覆盖父类方法：更新消息（同时更新内存和 IndexedDB）
   * @param {ChatLog[]} items 消息列表
   */
  override updateMessages(items: ChatLog[]): void {
    // 调用父类方法更新内存中的消息
    super.updateMessages(items);

    // 同时更新 IndexedDB
    this.saveMessagesToDb(items).catch((error) => {
      console.error("Failed to save messages to IndexedDB:", error);
    });
  }

  /**
   * 清空所有消息
   */
  override clearMessages(): void {
    // 先清空内存中的消息
    super.clearMessages();

    // 然后清空 IndexedDB 中的消息
    this.clearMessagesFromDb().catch((error) => {
      console.error("Error clearing messages from IndexedDB:", error);
    });
  }

  /**
   * 从存储中删除消息
   * @param {string} chatId 消息ID
   */
  override deleteMessage(chatId: string): void {
    // 先从内存中删除
    super.deleteMessage(chatId);

    // 然后从 IndexedDB 中删除
    this.deleteMessageFromDb(chatId).catch((error) => {
      console.error("Error deleting message from IndexedDB:", error);
    });
  }

  /**
   * 销毁实例，清理资源
   */
  destroy(): void {
    this.closeDatabase();
  }
}
