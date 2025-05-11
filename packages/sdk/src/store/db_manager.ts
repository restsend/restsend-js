// 数据库相关常量
export const DB_NAME = "im_message_store";
export const DB_VERSION = 2; // 每次更改表结构或索引时，增加版本号
export const MESSAGES_STORE_NAME = "chatLogs";
export const SYNC_STATUS_STORE = "syncStatus";

/**
 * DBManager 类负责管理 IndexedDB 数据库的连接和升级。
 * 这是一个单例类，确保整个应用共享同一个数据库连接。
 */
export class DBManager {
  private static instance: DBManager;
  private db: IDBDatabase | null = null;
  private isOpening: boolean = false;
  private pendingOpenPromises: Array<{ resolve: (db: IDBDatabase) => void; reject: (error: any) => void; }> = [];

  // 私有构造函数，防止外部直接实例化
  private constructor() {
    console.log(`[DBManager] DBManager instance created.`);
  }

  /**
   * 获取 DBManager 的单例实例。
   * @returns {DBManager} DBManager 实例
   */
  public static getInstance(): DBManager {
    if (!DBManager.instance) {
      DBManager.instance = new DBManager();
    }
    return DBManager.instance;
  }

  /**
   * 获取 IndexedDB 数据库实例。
   * 如果数据库未打开，则会尝试打开它。
   * @returns {Promise<IDBDatabase>} 数据库实例
   */
  public getDb(): Promise<IDBDatabase> {
    if (this.db) {
      return Promise.resolve(this.db);
    }

    if (this.isOpening) {
      return new Promise((resolve, reject) => {
        this.pendingOpenPromises.push({ resolve, reject });
      });
    }

    this.isOpening = true;
    console.log(`[DBManager] Starting to open database: ${DB_NAME}, Version: ${DB_VERSION}`);

    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        this.isOpening = false;
        const error = new Error("IndexedDB is not supported in this browser");
        console.error(`[DBManager] ${error.message}`);
        this.rejectPendingPromises(error);
        reject(error);
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error(`[DBManager] Error opening database:`, event);
        this.isOpening = false;
        const error = new Error("Could not open IndexedDB");
        this.rejectPendingPromises(error);
        reject(error);
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        this.isOpening = false;
        console.log(`[DBManager] Database opened successfully: ${DB_NAME}`);
        this.resolvePendingPromises(this.db);
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        console.log(`[DBManager] Upgrading database: ${DB_NAME} from version ${event.oldVersion} to ${event.newVersion}`);
        const db = (event.target as IDBOpenDBRequest).result;

        // 创建消息存储 Object Store
        if (!db.objectStoreNames.contains(MESSAGES_STORE_NAME)) {
          const messagesObjectStore = db.createObjectStore(MESSAGES_STORE_NAME, {
            keyPath: ["topicId", "chatId"],
          });
          messagesObjectStore.createIndex("by_topic_seq", ["topicId", "seq"], { unique: false });
          messagesObjectStore.createIndex("by_topic_deleted", ["topicId", "deleted"], { unique: false });
          console.log(`[DBManager] Created object store: ${MESSAGES_STORE_NAME} with indexes.`);
        } else {
          const transaction = (event.target as IDBOpenDBRequest).transaction;
          if (transaction){
            const messagesObjectStore = transaction.objectStore(MESSAGES_STORE_NAME);
            if (!messagesObjectStore.indexNames.contains("by_topic_seq")) {
                 messagesObjectStore.createIndex("by_topic_seq", ["topicId", "seq"], { unique: false });
                 console.log(`[DBManager] Created index 'by_topic_seq' on store: ${MESSAGES_STORE_NAME}`);
            }
            if (!messagesObjectStore.indexNames.contains("by_topic_deleted")) {
                 messagesObjectStore.createIndex("by_topic_deleted", ["topicId", "deleted"], { unique: false });
                 console.log(`[DBManager] Created index 'by_topic_deleted' on store: ${MESSAGES_STORE_NAME}`);
            }
          }
        }

        // 创建同步状态存储 Object Store
        if (!db.objectStoreNames.contains(SYNC_STATUS_STORE)) {
          db.createObjectStore(SYNC_STATUS_STORE, { keyPath: "topicId" });
          console.log(`[DBManager] Created object store: ${SYNC_STATUS_STORE}`);
        }
        console.log(`[DBManager] Database upgrade complete.`);
      };
    });
  }

  private resolvePendingPromises(db: IDBDatabase): void {
    this.pendingOpenPromises.forEach(p => p.resolve(db));
    this.pendingOpenPromises = [];
  }

  private rejectPendingPromises(error: any): void {
    this.pendingOpenPromises.forEach(p => p.reject(error));
    this.pendingOpenPromises = [];
  }

  /**
   * 关闭数据库连接。
   * 注意：由于是共享连接，应谨慎调用。
   * 通常在应用生命周期结束时调用。
   */
  public close(): void {
    if (this.db) {
      console.log(`[DBManager] Closing database: ${DB_NAME}`);
      this.db.close();
      this.db = null;
    }
  }
} 