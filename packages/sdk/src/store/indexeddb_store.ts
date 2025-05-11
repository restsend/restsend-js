import { ChatLog } from "../types";
import { IAllApi } from "../api";
import { MessageStore } from "./memery_store";
import { LogStatusReceived } from "../constants";
import { formatDate } from "../utils";
import { DBManager, MESSAGES_STORE_NAME, SYNC_STATUS_STORE } from "./db_manager";

// 自定义接口用于 IndexedDB 中存储的消息 (与 db_manager.ts 中的定义可以合并，此处为简化保留)
interface IndexedDBChatLog {
  topicId: string;
  chatId: string;
  seq: number;
  senderId: string;
  content?: any;
  createdAt: string;
  updatedAt: string;
  status: number;
  isSentByMe: boolean;
  deleted: number;
  recall?: boolean;
  deletes?: string[];
}

// 同步状态接口 (与 db_manager.ts 中的定义可以合并)
interface SyncStatus {
  topicId: string;
  lastSeq: number;
  updatedAt: string;
  hasMore: boolean;
}

/**
 * 基于 IndexedDB 的消息存储器，扩展自 MessageStore
 * 支持离线缓存和持久化存储，并支持消息的同步
 * 使用统一数据库存储所有会话的消息，通过 DBManager 管理数据库连接
 */
export class IndexedDBMessageStore extends MessageStore {
  private dbManager: DBManager;
  private syncStatus: SyncStatus | null = null;
  private isInitialSync: boolean = true; // 标记是否是初次同步
  private isStoreInitialized: boolean = false; // 添加初始化标记属性

  constructor(apis: IAllApi, topicId: string, bucketSize: number) {
    super(apis, topicId, bucketSize);
    this.dbManager = DBManager.getInstance();
    console.log(`[IndexedDBStore][${this.topicId}] 创建存储实例, bucketSize=${bucketSize}`);
    this.initializeStore();
  }

  private async initializeStore(): Promise<void> {
    console.log(`[IndexedDBStore][${this.topicId}] 初始化存储...`);
    try {
      await this.loadMessagesFromDB(0, this.bucketSize); // 尝试加载最新的 bucketSize 条消息
      await this.loadSyncStatus();
      this.isStoreInitialized = true; // 标记初始化完成
      console.log(`[IndexedDBStore][${this.topicId}] 存储初始化完成.`);
    } catch (error) {
      console.error(`[IndexedDBStore][${this.topicId}] 存储初始化失败:`, error);
    }
  }

  /**
   * 从 IndexedDB 加载消息到内存
   * @param {number} lastSeq 获取早于此seq的消息 (0表示获取最新消息)
   * @param {number} limit 限制返回的消息数量
   */
  private async loadMessagesFromDB(lastSeq: number = 0, limit: number = 20): Promise<void> {
    console.log(
      `[IndexedDBStore][${this.topicId}] 从数据库加载消息: lastSeq=${lastSeq}, limit=${limit}`
    );
    try {
      const db = await this.dbManager.getDb();
      const transaction = db.transaction([MESSAGES_STORE_NAME], "readonly");
      const objectStore = transaction.objectStore(MESSAGES_STORE_NAME);
      const index = objectStore.index("by_topic_seq");

      // 确定查询范围
      let range: IDBKeyRange | null = null;
      if (lastSeq > 0) {
        // 如果lastSeq > 0，查询小于此seq的消息（不包含lastSeq）
        range = IDBKeyRange.upperBound([this.topicId, lastSeq], true); // seq < lastSeq
      } else {
        // 如果lastSeq = 0，查询当前topic的所有消息
        range = IDBKeyRange.bound([this.topicId, 0], [this.topicId, Infinity]);
      }

      const messages: ChatLog[] = await new Promise((resolve) => {
        const result: ChatLog[] = [];
        // 使用prev方向，确保返回的消息按seq降序排序（最新的消息在前）
        const request = index.openCursor(range, "prev");
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor && result.length < limit) {
            const dbMessage = cursor.value as IndexedDBChatLog;
            if (dbMessage.deleted === 0 && dbMessage.topicId === this.topicId) {
              const chatLog = new ChatLog();
              Object.assign(chatLog, dbMessage, {
                createdAt: formatDate(dbMessage.createdAt),
                updatedAt: formatDate(dbMessage.updatedAt),
                isSentByMe: dbMessage.senderId === this.apis.auth.getMyId(),
              });
              result.push(chatLog);
            }
            cursor.continue();
          } else {
            resolve(result);
          }
        };
        request.onerror = (event) => {
          console.error(`[IndexedDBStore][${this.topicId}] DB游标查询失败:`, event);
          resolve([]);
        };
      });

      if (messages.length > 0) {
        console.log(`[IndexedDBStore][${this.topicId}] 从DB加载消息: ${messages.length}条`);
        
        if (lastSeq === 0) {
          // 如果是加载最新消息，直接替换内存中的消息
          this.messages = messages;
        } else {
          // 如果是加载历史消息，合并并去重
          const memoryMessages = [...this.messages];
          
          // 确保所有消息都满足 seq < lastSeq
          const validDBMessages = messages.filter((m) => m.seq < lastSeq);
          if (validDBMessages.length !== messages.length) {
            console.log(
              `[IndexedDBStore][${this.topicId}] 过滤掉不符合条件的消息: ${messages.length - validDBMessages.length}条`
            );
          }
          
          // 合并内存和数据库消息
          const allMessages = [...memoryMessages, ...validDBMessages];
          
          // 按seq降序排序
          allMessages.sort((a, b) => b.seq - a.seq);
          
          // 去重 - 基于复合键 (chatId+seq)
          const uniqueMessages = allMessages.filter(
            (msg, index, self) =>
              index === self.findIndex((m) => m.chatId === msg.chatId && m.seq === msg.seq)
          );
          
          this.messages = uniqueMessages;
        }
        console.log(
          `[IndexedDBStore][${this.topicId}] 消息内存状态更新: 总数=${this.messages.length}`
        );
      } else {
        if (lastSeq === 0) this.messages = [];
        console.log(`[IndexedDBStore][${this.topicId}] 数据库中无符合条件消息: lastSeq=${lastSeq}`);
      }
    } catch (error) {
      console.error(`[IndexedDBStore][${this.topicId}] DB加载消息失败:`, error);
      if (lastSeq === 0) this.messages = [];
    }
  }

  private async loadSyncStatus(): Promise<void> {
    console.log(`[IndexedDBStore][${this.topicId}] 加载同步状态...`);
    try {
      const db = await this.dbManager.getDb();
      const transaction = db.transaction([SYNC_STATUS_STORE], "readonly");
      const store = transaction.objectStore(SYNC_STATUS_STORE);
      const request = store.get(this.topicId);

      return new Promise((resolve) => {
        request.onsuccess = () => {
          this.syncStatus = request.result || null;
          if (this.syncStatus) {
            console.log(
              `[IndexedDBStore][${this.topicId}] 同步状态加载: lastSeq=${this.syncStatus.lastSeq}, hasMore=${this.syncStatus.hasMore}`
            );
          } else {
            console.log(`[IndexedDBStore][${this.topicId}] 无本地同步状态`);
          }
          resolve();
        };
        request.onerror = (event) => {
          console.error(`[IndexedDBStore][${this.topicId}] 加载同步状态失败:`, event);
          this.syncStatus = null;
          resolve();
        };
      });
    } catch (error) {
      console.error(`[IndexedDBStore][${this.topicId}] 加载同步状态过程失败:`, error);
      this.syncStatus = null;
    }
  }

  private async updateSyncStatus(
    lastSeq: number,
    hasMore: boolean,
    serverReturnCount?: number,
    requestLimit?: number
  ): Promise<void> {
    console.log(
      `[IndexedDBStore][${this.topicId}] 更新同步状态: lastSeq=${lastSeq}, hasMore=${hasMore}`
    );
    try {
      const db = await this.dbManager.getDb();
      const transaction = db.transaction([SYNC_STATUS_STORE], "readwrite");
      const store = transaction.objectStore(SYNC_STATUS_STORE);

      let calculatedHasMore = hasMore;
      if (
        typeof serverReturnCount === "number" &&
        typeof requestLimit === "number" &&
        serverReturnCount < requestLimit
      ) {
        calculatedHasMore = false;
        console.log(
          `[IndexedDBStore][${this.topicId}] 服务器返回消息(${serverReturnCount}) < 请求数量(${requestLimit}), hasMore设为false`
        );
      }

      const newStatus: SyncStatus = {
        topicId: this.topicId,
        lastSeq: lastSeq,
        updatedAt: new Date().toISOString(),
        hasMore: calculatedHasMore,
      };
      store.put(newStatus);
      this.syncStatus = newStatus;
      console.log(
        `[IndexedDBStore][${this.topicId}] 同步状态已更新: lastSeq=${newStatus.lastSeq}, hasMore=${newStatus.hasMore}`
      );
    } catch (error) {
      console.error(`[IndexedDBStore][${this.topicId}] 更新同步状态失败:`, error);
    }
  }

  override async getMessages(
    lastSeq: number,
    limit: number
  ): Promise<{ logs: ChatLog[]; hasMore: boolean }> {
    console.log(
      `[IndexedDBStore][${this.topicId}] getMessages调用: lastSeq=${lastSeq}, limit=${limit}`
    );

    // 初始同步：如果服务器的 seq > 本地最后同步的 seq，进行同步
    if (this.isInitialSync && lastSeq > 0) {
      const localLastSeq = this.syncStatus?.lastSeq || 0;
      if (lastSeq > localLastSeq) {
        console.log(
          `[IndexedDBStore][${this.topicId}] 发现服务器数据更新(${lastSeq} > ${localLastSeq})，执行初始同步`
        );
        await this.initSync(lastSeq);
      }
      this.isInitialSync = false;
    }

    // 1. 先从内存获取消息
    let result: ChatLog[] = [];
    const isLatestQuery = lastSeq === 0;

    // 添加调试日志，记录内存中的消息数量和seq值
    console.log(`[IndexedDBStore][${this.topicId}] 内存中现有消息数量: ${this.messages.length}条`);
    if (this.messages.length > 0) {
      const seqValues = this.messages.map(m => m.seq).join(',');
      console.log(`[IndexedDBStore][${this.topicId}] 内存消息seq值: ${seqValues}`);
    }

    if (isLatestQuery) {
      // 获取最新消息
      result = this.messages.slice(0, limit);
      console.log(`[IndexedDBStore][${this.topicId}] 最新查询模式，直接获取前${limit}条，结果: ${result.length}条`);
    } else {
      // 获取历史消息 (seq < lastSeq)
      const beforeFilter = this.messages.length;
      result = this.messages.filter((m) => m.seq <= lastSeq).slice(0, limit);
      const afterFilter = this.messages.filter((m) => m.seq <= lastSeq).length;
      console.log(
        `[IndexedDBStore][${this.topicId}] 历史查询模式(seq<=${lastSeq})，过滤前${beforeFilter}条，过滤后${afterFilter}条，最终结果: ${result.length}条`
      );
      if (beforeFilter !== afterFilter) {
        // 记录被过滤掉的消息的seq值，以便调试
        const filteredOutMessages = this.messages.filter((m) => m.seq > lastSeq);
        const filteredSeqs = filteredOutMessages.map(m => m.seq).join(',');
        console.log(`[IndexedDBStore][${this.topicId}] 被过滤掉的消息seq值: ${filteredSeqs}`);
      }
    }

    // 确保计算正确，检查result中的每条消息是否有效
    if (result.length > 0 && result.length < limit && this.messages.length >= limit) {
      console.log(`[IndexedDBStore][${this.topicId}] ⚠️ 警告: 结果数量异常(${result.length}<${limit})，检查计算逻辑`);
      // 检查是否存在undefined或null元素
      const hasInvalidItems = result.some(item => !item);
      if (hasInvalidItems) {
        console.log(`[IndexedDBStore][${this.topicId}] ⚠️ 发现结果集中存在无效元素，可能导致计数错误`);
        // 清理无效元素
        result = result.filter(Boolean);
        console.log(`[IndexedDBStore][${this.topicId}] 清理后结果数量: ${result.length}`);
      }
    }

    // 内存中有足够消息，或者已经没有更多消息可获取，直接返回
    if (result.length >= limit || !this.hasMore()) {
      console.log(
        `[IndexedDBStore][${this.topicId}] 内存数据满足要求: ${result.length}条, hasMore=${this.hasMore()}`
      );
      return { logs: result, hasMore: this.hasMore() };
    }

    // 2. 检查是否真的需要从数据库获取更多消息
    // 如果内存中的消息不足limit，且内存中所有符合条件的消息都已经获取
    const filteredMessagesCount = isLatestQuery 
      ? this.messages.length 
      : this.messages.filter(m => m.seq <= lastSeq).length;
    
    // 如果内存中符合条件的消息已经全部获取，但数量仍然不足limit
    // 且我们确信有更多消息(hasMore为true)，才需要从数据库获取
    // 判断是否需要从数据库加载更多消息的条件:
    // 1. 当前结果数量少于请求的limit
    // 2. 我们已确认确实有更多消息(hasMore为true)
    // 3. 本次查询的结果数量小于已过滤的消息总数，表明可能还有更多消息未加载
    const needsMoreFromDB = result.length < limit && 
                           this.hasMore() && 
                           (result.length < filteredMessagesCount || 
                            (isLatestQuery && this.messages.length > result.length));
    
    if (needsMoreFromDB) {
      console.log(
        `[IndexedDBStore][${this.topicId}] 内存数据不足(${result.length}/${limit})，且确认需要获取更多数据，从数据库获取`
      );
      
      // 使用新的loadMessagesFromDB接口，始终传递数字类型的lastSeq
      await this.loadMessagesFromDB(isLatestQuery ? 0 : lastSeq, limit);

      // 重新从内存获取结果(此时内存已经被loadMessagesFromDB更新)
      if (isLatestQuery) {
        // 获取最新消息（序号最大的前limit条）
        result = this.messages.slice(0, limit);
      } else {
        // 严格获取 seq < lastSeq 的消息
        result = this.messages.filter((m) => m.seq <= lastSeq).slice(0, limit);

        // 检查并记录日志，帮助调试
        const filteredCount =
          this.messages.length - this.messages.filter((m) => m.seq <= lastSeq).length;
        if (filteredCount > 0) {
          console.log(
            `[IndexedDBStore][${this.topicId}] 过滤掉不符合条件(seq<=${lastSeq})的消息: ${filteredCount}条`
          );
        }
      }

      // 数据库提供了足够消息，或者已经没有更多消息可获取，直接返回
      if (result.length >= limit || !this.hasMore()) {
        console.log(
          `[IndexedDBStore][${this.topicId}] 数据库数据满足要求: ${result.length}条, hasMore=${this.hasMore()}`
        );
        return { logs: result, hasMore: this.hasMore() };
      }
    } else if (result.length < limit) {
      // 内存中消息不足limit，但已经是全部可用消息或者没有更多数据
      console.log(
        `[IndexedDBStore][${this.topicId}] 内存中已包含所有可用消息(${result.length}<${limit})，无需额外获取`
      );
      if (!this.hasMore()) {
        return { logs: result, hasMore: false };
      }
    }

    // 3. 从服务器获取更多消息
    console.log(
      `[IndexedDBStore][${this.topicId}] 数据库数据不足(${result.length}/${limit})，从服务器获取`
    );
    const serverLimit = limit - result.length;
    let serverFromSeq: number;

    if (isLatestQuery) {
      serverFromSeq = 0; // 获取最新消息
    } else {
      // 计算应该从哪个seq开始获取
      // 如果内存中有历史消息，从最小seq开始获取更早的消息
      // 否则直接使用传入的lastSeq作为起点
      if (result.length > 0) {
        // 找到当前内存中最小的seq
        const minSeq = Math.min(...result.map((m) => m.seq));
        // 这里我们直接使用最小seq作为serverFromSeq
        // 在fetchMessagesFromServer中会将其减1后传给服务器
        // 这样服务器返回的是seq > (minSeq-1)即seq >= minSeq的消息
        // 在客户端会再通过去重过滤掉已有的消息
        serverFromSeq = minSeq;
      } else {
        serverFromSeq = lastSeq;
      }

      console.log(
        `[IndexedDBStore][${this.topicId}] 计算服务器查询参数: serverFromSeq=${serverFromSeq}, result.length=${result.length}`
      );
    }

    console.log(
      `[IndexedDBStore][${this.topicId}] 将从服务器获取：fromSeq=${serverFromSeq}, limit=${serverLimit}`
    );
    const serverRes = await this.fetchMessagesFromServerAndUpdate(serverFromSeq, serverLimit);

    // 合并服务器返回的消息到结果中
    if (serverRes.logs.length > 0) {
      // 1. 检查确保所有服务器返回的消息符合条件
      const validServerMessages = isLatestQuery
        ? serverRes.logs
        : serverRes.logs.filter((m) => m.seq <= lastSeq);

      if (validServerMessages.length !== serverRes.logs.length) {
        console.log(
          `[IndexedDBStore][${this.topicId}] 服务器返回的消息中有 ${serverRes.logs.length - validServerMessages.length} 条不符合条件`
        );
      }

      // 2. 检查消息是否已经在结果集中，避免重复
      const existingSeqs = result.map(msg => msg.seq);
      const uniqueServerMessages = validServerMessages.filter(msg => !existingSeqs.includes(msg.seq));
      
      if (uniqueServerMessages.length < validServerMessages.length) {
        console.log(
          `[IndexedDBStore][${this.topicId}] 过滤掉result中已有的消息: ${validServerMessages.length - uniqueServerMessages.length}/${validServerMessages.length}条`
        );
      }

      // 3. 合并内存结果与服务器结果
      const combinedMessages = [...result, ...uniqueServerMessages];

      // 4. 按 seq 降序排序
      combinedMessages.sort((a, b) => b.seq - a.seq);

      // 5. 去重并限制数量
      result = combinedMessages
        .filter(
          (msg, index, self) =>
            index === self.findIndex((m) => m.chatId === msg.chatId && m.seq === msg.seq)
        )
        .slice(0, limit);

      console.log(`[IndexedDBStore][${this.topicId}] 合并服务器消息后: ${result.length}条`);
    }

    // 更新hasMore状态：如果服务器返回数量少于请求数量，说明没有更多消息了
    const serverHasNoMore = serverRes.logs.length < serverLimit;
    if (serverHasNoMore && this.hasMore()) {
      const syncSeq = isLatestQuery
        ? serverRes.logs.length > 0
          ? Math.max(...serverRes.logs.map((l) => l.seq))
          : this.syncStatus?.lastSeq || 0
        : serverFromSeq;

      console.log(
        `[IndexedDBStore][${this.topicId}] 服务器返回消息数(${serverRes.logs.length}) < 请求数(${serverLimit})，更新hasMore=false`
      );
      await this.updateSyncStatus(syncSeq, false);
    }

    console.log(
      `[IndexedDBStore][${this.topicId}] 最终返回: ${result.length}条, hasMore=${this.hasMore()}`
    );
    return { logs: result, hasMore: this.hasMore() };
  }

  private async fetchMessagesFromServerAndUpdate(
    fromSeq: number,
    limit: number
  ): Promise<{ logs: ChatLog[]; hasMore: boolean }> {
    console.log(
      `[IndexedDBStore][${this.topicId}] 从服务器获取消息: fromSeq=${fromSeq}, limit=${limit}`
    );
    if (limit <= 0) return { logs: [], hasMore: this.hasMore() }; //避免无效请求
    try {
      const { logs, hasMore: serverHasMore } = await this.fetchMessagesFromServer(fromSeq, limit);
      console.log(
        `[IndexedDBStore][${this.topicId}] 服务器返回: ${logs.length}条, serverHasMore=${serverHasMore}`
      );

      if (logs.length > 0) {
        // 调试信息 - 检查每条消息是否有chatId
        for (const log of logs) {
          if (!log.chatId) {
            console.log(
              `[IndexedDBStore][${this.topicId}] 警告: 消息缺少chatId, seq=${log.seq}, 消息内容:`,
              JSON.stringify(log)
            );
          }
        }

        // 检查消息是否已经存在于内存中，避免重复处理
        const existingSeqs = this.messages.map(msg => msg.seq);
        const newLogs = logs.filter(log => !existingSeqs.includes(log.seq));
        
        if (newLogs.length < logs.length) {
          console.log(
            `[IndexedDBStore][${this.topicId}] 过滤掉已存在的消息: ${logs.length - newLogs.length}/${logs.length}条`
          );
        }
        
        // 只有有新消息时才更新
        if (newLogs.length > 0) {
          // 确保服务器返回的消息按seq降序排序（mock数据已经是降序的）
          newLogs.sort((a, b) => b.seq - a.seq);
          this.updateMessages(newLogs); // 更新内存和DB

          // 检查是否所有消息都已正确保存
          setTimeout(() => {
            this.checkMessagesInDb(newLogs).catch((err) =>
              console.error(`[IndexedDBStore][${this.topicId}] 检查消息保存状态失败:`, err)
            );
          }, 500);
        } else {
          console.log(`[IndexedDBStore][${this.topicId}] 所有服务器返回的消息已存在于本地，无需更新`);
        }

        const newLastSeq =
          fromSeq === 0 ? Math.max(...logs.map((l) => l.seq)) : Math.min(...logs.map((l) => l.seq));
        await this.updateSyncStatus(newLastSeq, serverHasMore, logs.length, limit);
      } else if (fromSeq === 0) {
        // 获取最新但无返回
        await this.updateSyncStatus(this.syncStatus?.lastSeq || 0, false, 0, limit);
      }
      
      // 返回过滤前的logs，让getMessages处理过滤和合并
      return { logs, hasMore: this.syncStatus?.hasMore || false };
    } catch (error) {
      console.error(`[IndexedDBStore][${this.topicId}] 从服务器获取消息失败:`, error);
      return { logs: [], hasMore: this.hasMore() }; // 出错时返回当前状态
    }
  }

  // 辅助方法：检查消息是否成功保存到数据库
  private async checkMessagesInDb(logs: ChatLog[]): Promise<void> {
    try {
      const db = await this.dbManager.getDb();
      const transaction = db.transaction([MESSAGES_STORE_NAME], "readonly");
      const store = transaction.objectStore(MESSAGES_STORE_NAME);

      const seqList = logs.map((l) => l.seq).join(", ");
      console.log(`[IndexedDBStore][${this.topicId}] 检查消息是否保存成功，seq列表: ${seqList}`);

      let foundCount = 0;
      let missingCount = 0;

      for (const log of logs) {
        // 使用chatId或生成一个基于seq的键
        const key = [this.topicId, log.chatId || `msg_${log.seq}`];

        // eslint-disable-next-line no-await-in-loop
        const exists = await new Promise<boolean>((resolve) => {
          const request = store.get(key);
          request.onsuccess = () => resolve(!!request.result);
          request.onerror = () => {
            console.error(
              `[IndexedDBStore][${this.topicId}] 查询消息失败: seq=${log.seq}, chatId=${log.chatId}`
            );
            resolve(false);
          };
        });

        if (exists) {
          foundCount++;
        } else {
          missingCount++;
          console.warn(
            `[IndexedDBStore][${this.topicId}] 消息未保存到数据库: seq=${log.seq}, chatId=${log.chatId}`
          );
        }
      }

      console.log(
        `[IndexedDBStore][${this.topicId}] 检查结果: 总共${logs.length}条, 成功保存${foundCount}条, 未保存${missingCount}条`
      );
    } catch (error) {
      console.error(`[IndexedDBStore][${this.topicId}] 检查消息保存状态失败:`, error);
    }
  }

  async initSync(serverLastSeqHint: number): Promise<void> {
    console.log(
      `[IndexedDBStore][${this.topicId}] 初始化同步流程: serverLastSeqHint=${serverLastSeqHint}`
    );
    if (!this.isStoreInitialized) await this.initializeStore();

    const localLastSeq = this.syncStatus?.lastSeq || 0;
    console.log(
      `[IndexedDBStore][${this.topicId}] 本地同步状态: lastSeq=${localLastSeq}, hasMore=${this.hasMore()}`
    );

    // 如果服务器明确有更新 (例如通过推送得知，或业务逻辑上认为 serverLastSeqHint 是可靠的最新seq)
    // 或者本地就没有同步记录
    if (serverLastSeqHint > localLastSeq || !this.syncStatus) {
      console.log(
        `[IndexedDBStore][${this.topicId}] 需要从服务器同步最新消息 (hint=${serverLastSeqHint} > local=${localLastSeq})`
      );
      
      // 检查内存中是否已有最新消息，避免重复请求
      const maxMemorySeq = this.messages.length > 0 ? Math.max(...this.messages.map(m => m.seq)) : 0;
      if (maxMemorySeq >= serverLastSeqHint) {
        console.log(`[IndexedDBStore][${this.topicId}] 内存中已有最新消息(seq=${maxMemorySeq} >= ${serverLastSeqHint})，无需同步`);
      } else {
        await this.fetchMessagesFromServerAndUpdate(0, this.bucketSize); // 获取最新的一页
      }
    } else {
      console.log(`[IndexedDBStore][${this.topicId}] 本地数据相对较新或一致，暂不主动拉取最新。`);
    }
    this.isInitialSync = false;
    console.log(`[IndexedDBStore][${this.topicId}] 初始化同步流程结束.`);
  }

  override updateMessages(items: ChatLog[]): void {
    if (!items || items.length === 0) return;
    console.log(`[IndexedDBStore][${this.topicId}] updateMessages调用: ${items.length}条`);
    
    // 确保消息按照seq排序后再更新
    const sortedItems = [...items].sort((a, b) => b.seq - a.seq);
    super.updateMessages(sortedItems); // 更新内存 (父类方法会排序并去重)
    
    this.saveMessagesToDb(sortedItems).catch((error) =>
      console.error(`[IndexedDBStore][${this.topicId}] 后台存储消息到DB失败:`, error)
    );
    this.limitMemoryMessages();
  }

  private async saveMessagesToDb(messages: ChatLog[]): Promise<void> {
    if (!messages || messages.length === 0) return;
    console.log(`[IndexedDBStore][${this.topicId}] 存储消息到DB: ${messages.length}条`);
    try {
      const db = await this.dbManager.getDb();
      const transaction = db.transaction([MESSAGES_STORE_NAME], "readwrite");
      const store = transaction.objectStore(MESSAGES_STORE_NAME);

      // 确保消息按seq降序排序（虽然接收的messages应该已经排序，但再次确保）
      const sortedMessages = [...messages].sort((a, b) => b.seq - a.seq);

      // 创建存储操作的Promise数组，以便跟踪每个操作
      const putPromises: Promise<IDBValidKey>[] = [];

      for (const message of sortedMessages) {
        // 确保消息有chatId，没有则使用seq创建一个唯一ID
        const chatId = message.chatId || `msg_${message.seq}_${Date.now()}`;
        if (!message.chatId) {
          console.log(
            `[IndexedDBStore][${this.topicId}] 消息缺少chatId，自动生成: ${chatId} (seq=${message.seq})`
          );
          message.chatId = chatId;
        }

        const messageToStore: IndexedDBChatLog = {
          topicId: this.topicId,
          chatId: message.chatId,
          seq: message.seq,
          senderId: message.senderId,
          content: message.content ? { ...message.content } : undefined,
          createdAt:
            typeof message.createdAt === "string"
              ? message.createdAt
              : (message.createdAt || new Date()).toISOString(),
          updatedAt:
            typeof message.updatedAt === "string"
              ? message.updatedAt
              : (message.updatedAt || new Date()).toISOString(),
          status: message.status || LogStatusReceived,
          isSentByMe: message.senderId === this.apis.auth.getMyId() || false,
          deleted: 0,
        };

        // 为每个put操作创建一个Promise
        const putPromise = new Promise<IDBValidKey>((resolve, reject) => {
          const request = store.put(messageToStore);
          request.onsuccess = () => {
            // 记录每个消息的保存结果
            resolve(request.result);
          };
          request.onerror = (event) => {
            console.error(
              `[IndexedDBStore][${this.topicId}] 存储消息失败(chatId=${message.chatId}, seq=${message.seq}):`,
              event
            );
            reject(event);
          };
        });

        putPromises.push(putPromise);
      }

      // 等待所有put操作完成
      const results = await Promise.all(putPromises);
      console.log(
        `[IndexedDBStore][${this.topicId}] 所有消息保存操作完成: ${results.length}/${sortedMessages.length}`
      );

      // 等待事务完成
      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => {
          console.log(
            `[IndexedDBStore][${this.topicId}] 成功存储全部${sortedMessages.length}条消息到数据库`
          );
          resolve();
        };
        transaction.onerror = (event) => {
          console.error(`[IndexedDBStore][${this.topicId}] 事务失败:`, event);
          reject(event);
        };
        transaction.onabort = (event) => {
          console.error(`[IndexedDBStore][${this.topicId}] 事务中止:`, event);
          reject(new Error("Transaction was aborted"));
        };
      });
    } catch (error) {
      console.error(`[IndexedDBStore][${this.topicId}] 存储消息到DB过程失败:`, error);
      throw error;
    }
  }

  private limitMemoryMessages(maxCount: number = 60): void {
    if (this.messages.length > maxCount) {
      console.log(
        `[IndexedDBStore][${this.topicId}] 限制内存消息: ${this.messages.length} -> ${maxCount}`
      );
      this.messages = this.messages.slice(0, maxCount); // 假设已按seq降序排序
    }
  }

  override async deleteMessage(chatId: string): Promise<void> {
    console.log(`[IndexedDBStore][${this.topicId}] 删除消息: chatId=${chatId}`);
    super.deleteMessage(chatId); // 从内存删除
    try {
      const db = await this.dbManager.getDb();
      const transaction = db.transaction([MESSAGES_STORE_NAME], "readwrite");
      const store = transaction.objectStore(MESSAGES_STORE_NAME);
      const getRequest = store.get([this.topicId, chatId]);

      return new Promise<void>((resolve, reject) => {
        getRequest.onsuccess = () => {
          const message = getRequest.result as IndexedDBChatLog | undefined;
          if (message) {
            message.deleted = 1; // 标记删除
            const updateRequest = store.put(message);
            updateRequest.onsuccess = () => resolve();
            updateRequest.onerror = (event) => reject(event);
          } else {
            resolve(); // 未找到不处理
          }
        };
        getRequest.onerror = (event) => reject(event);
      });
    } catch (error) {
      console.error(`[IndexedDBStore][${this.topicId}] DB删除消息失败:`, error);
      throw error;
    }
  }

  override async clearMessages(): Promise<void> {
    console.log(`[IndexedDBStore][${this.topicId}] 清空会话消息`);
    super.clearMessages(); // 清空内存
    try {
      const db = await this.dbManager.getDb();
      const transaction = db.transaction([MESSAGES_STORE_NAME, SYNC_STATUS_STORE], "readwrite");
      const msgStore = transaction.objectStore(MESSAGES_STORE_NAME);
      const syncStore = transaction.objectStore(SYNC_STATUS_STORE);

      // 删除该topicId下的所有消息
      const range = IDBKeyRange.bound([this.topicId, 0], [this.topicId, Infinity]);
      const index = msgStore.index("by_topic_seq"); // 使用索引进行范围删除
      let deleteCount = 0;

      return new Promise<void>((resolve, reject) => {
        index.openCursor(range).onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            if (cursor.value.topicId === this.topicId) {
              // Double check topicId
              cursor.delete();
              deleteCount++;
            }
            cursor.continue();
          } else {
            // 所有匹配的消息删除完毕后，删除同步状态
            console.log(`[IndexedDBStore][${this.topicId}] 从DB清除了 ${deleteCount} 条消息`);
            const syncDeleteRequest = syncStore.delete(this.topicId);
            syncDeleteRequest.onsuccess = () => {
              this.syncStatus = null;
              resolve();
            };
            syncDeleteRequest.onerror = (err) => reject(err);
          }
        };
        index.openCursor(range).onerror = (event) => reject(event);
      });
    } catch (error) {
      console.error(`[IndexedDBStore][${this.topicId}] DB清空消息失败:`, error);
      throw error;
    }
  }

  destroy(): void {
    console.log(`[IndexedDBStore][${this.topicId}] 销毁存储实例.`);
    // DBManager 管理的数据库不需要在此关闭
  }

  override hasMore(): boolean {
    const more = this.syncStatus ? this.syncStatus.hasMore : true; // 默认为true，除非明确知道没有更多
    console.log(`[IndexedDBStore][${this.topicId}] hasMore: ${more}`);
    return more;
  }

  // fetchMessagesFromServer 继承父类，可以按需覆盖增加日志
  override async fetchMessagesFromServer(
    lastSeq: number,
    limit: number
  ): Promise<{ logs: ChatLog[]; hasMore: boolean }> {
    console.log(
      `[IndexedDBStore][${this.topicId}] fetchMessagesFromServer: lastSeq=${lastSeq}, limit=${limit}`
    );
    
    // 注意：服务器的查询逻辑是 seq > startSeq 而不是 seq < startSeq
    // 对于第二次分页查询，我们需要将最小的seq减1作为startSeq传给服务器
    // 这样服务器会返回seq > (minSeq-1)，也就是seq >= minSeq的消息
    // 但由于这些消息已经在本地，客户端会进行去重处理
    
    // 如果是获取最新消息(lastSeq=0)，直接调用父类方法
    if (lastSeq === 0) {
      return super.fetchMessagesFromServer(lastSeq, limit);
    }
    
    // 如果是获取历史消息，传递(lastSeq-1)作为startSeq
    // 这样避免重复获取已有的最小seq消息
    const adjustedLastSeq = Math.max(0, lastSeq - 1);
    console.log(
      `[IndexedDBStore][${this.topicId}] 调整查询参数: 原始lastSeq=${lastSeq}, 调整后=${adjustedLastSeq}`
    );
    return super.fetchMessagesFromServer(adjustedLastSeq, limit);
  }
}
