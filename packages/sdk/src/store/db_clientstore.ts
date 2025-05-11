import { ClientStore } from "./store";
import { IndexedDBMessageStore } from "./indexeddb_store";
import { IAllApi } from "../api";
import { IMessageStore } from "./interfaces";

/**
 * 使用 IndexedDB 的客户端存储类
 * 扩展自 ClientStore，使用 IndexedDBMessageStore 替代 MessageStore
 */
export class IndexedDBClientStore extends ClientStore {
  /**
   * 构造函数
   * @param {IAllApi} apis API 接口
   */
  constructor(apis: IAllApi) {
    super(apis);
  }

  /**
   * 覆盖父类方法：获取消息存储
   * 返回 IndexedDBMessageStore 实例而不是 MessageStore 实例
   * @param {string} topicId 主题ID
   * @param {number} bucketSize 消息分页大小，默认20
   * @returns {IMessageStore} 消息存储实例
   */
  getMessageStore(topicId: string, bucketSize: number = 20): IMessageStore {
    let store = this.topicMessageStoree[topicId];
    if (store) {
      return store;
    }
    
    // 创建 IndexedDBMessageStore 实例，而不是 MessageStore 实例
    store = new IndexedDBMessageStore(this.apis, topicId, bucketSize);
    this.topicMessageStoree[topicId] = store;
    return store;
  }

  /**
   * 清理资源，关闭所有数据库连接
   */
  destroy(): void {
    // 关闭所有 IndexedDBMessageStore 的数据库连接
    for (const topicId in this.topicMessageStoree) {
      const store = this.topicMessageStoree[topicId];
      if (store instanceof IndexedDBMessageStore) {
        store.destroy();
      }
    }
  }
} 