import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IndexedDBMessageStore } from '../../src/store/indexeddb_store';
import { IAllApi } from '../../src/api';
import { ChatLog } from '../../src/types';

// 模拟 indexedDB
const mockIndexedDB = {
  open: vi.fn(),
};

// 模拟数据库开启请求
const mockOpenRequest = {
  onerror: null,
  onsuccess: null,
  onupgradeneeded: null,
  result: {
    transaction: vi.fn(),
    close: vi.fn(),
    objectStoreNames: {
      contains: vi.fn().mockReturnValue(true),
    },
  },
};

// 模拟数据库事务
const mockTransaction = {
  objectStore: vi.fn(),
  oncomplete: null,
  onerror: null,
};

// 模拟对象存储
const mockObjectStore = {
  index: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

// 模拟索引
const mockIndex = {
  openCursor: vi.fn(),
  get: vi.fn(),
};

// 模拟游标
const mockCursor = {
  value: {
    topicId: 'topic1',
    chatId: 'msg_1',
    seq: 1,
    senderId: 'user1',
    content: { type: 'text', text: 'Hello' },
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
    status: 0,
    isSentByMe: false,
    deleted: 0,
  },
  continue: vi.fn(),
};

// 模拟请求
const mockRequest = {
  onsuccess: null,
  onerror: null,
  result: null,
};

// 模拟API
const mockApi = {
  auth: {
    getToken: vi.fn().mockResolvedValue('mock_token'),
    getMyId: vi.fn().mockReturnValue('user1'),
  },
  topic: {
    fetch: vi.fn(),
    detail: vi.fn(),
    star: vi.fn(),
    unstar: vi.fn(),
    del: vi.fn(),
    fetchNotices: vi.fn(),
    join: vi.fn(),
  },
  chat: {
    sendMsg: vi.fn(),
    chatList: vi.fn().mockImplementation((topicId, lastSeq, limit) => {
      // 模拟从服务器获取消息
      const logs = [];
      const startSeq = lastSeq > 0 ? lastSeq - 1 : 10;  // 假设服务器最新消息seq是10
      const endSeq = Math.max(startSeq - limit + 1, 1);
      
      for (let seq = startSeq; seq >= endSeq; seq--) {
        const chatLog = new ChatLog();
        chatLog.chatId = `msg_${seq}`;
        chatLog.seq = seq;
        chatLog.senderId = 'user1';
        chatLog.content = { type: 'text', text: `Message ${seq}` };
        chatLog.createdAt = new Date().toISOString();
        chatLog.updatedAt = new Date().toISOString();
        chatLog.status = 0;
        chatLog.isSentByMe = true;
        logs.push(chatLog);
      }
      
      return Promise.resolve({
        logs,
        hasMore: endSeq > 1,
      });
    }),
    recall: vi.fn(),
    pin: vi.fn(),
    unpin: vi.fn(),
  },
};

describe('IndexedDBMessageStore', () => {
  let store;
  
  beforeEach(() => {
    // 设置全局 indexedDB
    global.indexedDB = mockIndexedDB;
    
    // 设置模拟链
    mockIndexedDB.open.mockReturnValue(mockOpenRequest);
    mockTransaction.objectStore.mockReturnValue(mockObjectStore);
    mockObjectStore.index.mockReturnValue(mockIndex);
    mockObjectStore.get.mockReturnValue(mockRequest);
    mockIndex.openCursor.mockReturnValue(mockRequest);
    mockIndex.get.mockReturnValue(mockRequest);
    
    mockOpenRequest.result.transaction.mockReturnValue(mockTransaction);
    
    // 创建消息存储实例
    store = new IndexedDBMessageStore(mockApi, 'topic1', 20);
    
    // 模拟数据库打开成功
    if (mockOpenRequest.onsuccess) {
      mockOpenRequest.onsuccess({ target: mockOpenRequest });
    }

    // 重置console.log以减少测试输出噪音
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    vi.resetAllMocks();
    if (console.log.mockRestore) console.log.mockRestore();
    if (console.error.mockRestore) console.error.mockRestore();
  });
  
  describe('getMessages', () => {
    it('应该首先尝试从内存中获取消息', async () => {
      // 模拟内存中已有足够的消息
      const mockMessages = [];
      for (let i = 10; i >= 6; i--) {
        const msg = new ChatLog();
        msg.chatId = `msg_${i}`;
        msg.seq = i;
        msg.content = { type: 'text', text: `Message ${i}` };
        mockMessages.push(msg);
      }
      
      // @ts-ignore - 直接设置私有属性用于测试
      store.messages = mockMessages;
      
      // 获取最新消息 (lastSeq = 0)
      const result = await store.getMessages(0, 3);
      
      // 应该返回内存中的前3条消息
      expect(result.logs.length).toBe(3);
      expect(result.logs[0].seq).toBe(10);  // 最新的消息
      expect(result.logs[1].seq).toBe(9);
      expect(result.logs[2].seq).toBe(8);
      
      // API不应该被调用
      expect(mockApi.chat.chatList).not.toHaveBeenCalled();
    });
    
    it('应该在内存不足时从IndexedDB加载消息', async () => {
      // 模拟内存中无消息
      // @ts-ignore - 直接设置私有属性用于测试
      store.messages = [];
      
      // 模拟从IndexedDB加载消息的结果
      const mockDbMessages = [];
      for (let i = 10; i >= 6; i--) {
        const msg = new ChatLog();
        msg.chatId = `msg_${i}`;
        msg.seq = i;
        msg.content = { type: 'text', text: `DB Message ${i}` };
        mockMessages.push(msg);
      }
      
      // 模拟loadMessagesFromDBWithRange方法
      // @ts-ignore - 替换私有方法用于测试
      store.loadMessagesFromDBWithRange = vi.fn().mockResolvedValue(mockDbMessages);
      
      // 模拟loadSyncStatus方法
      // @ts-ignore - 替换私有方法用于测试
      store.loadSyncStatus = vi.fn().mockResolvedValue(undefined);

      // 模拟同步状态
      // @ts-ignore - 直接设置私有属性用于测试
      store.syncStatus = { topicId: 'topic1', lastSeq: 10, hasMore: false, updatedAt: new Date().toISOString() };
      
      // 获取消息
      const result = await store.getMessages(0, 3);
      
      // 应该调用了loadMessagesFromDBWithRange
      // @ts-ignore - 访问私有方法用于测试
      expect(store.loadMessagesFromDBWithRange).toHaveBeenCalled();
    });
    
    it('应该在IndexedDB也不足时从服务器获取消息', async () => {
      // 模拟内存中无消息
      // @ts-ignore - 直接设置私有属性用于测试
      store.messages = [];
      
      // 模拟loadMessagesFromDB方法，返回空数组
      // @ts-ignore - 替换私有方法用于测试
      store.loadMessagesFromDB = vi.fn().mockImplementation(() => {
        // @ts-ignore - 直接设置私有属性用于测试
        store.messages = [];
        return Promise.resolve();
      });
      
      // 模拟hasMore返回true，表示可能有更多消息
      // @ts-ignore - 替换方法用于测试
      store.hasMore = vi.fn().mockReturnValue(true);
      
      // 模拟updateMessages方法
      // @ts-ignore - 替换方法用于测试
      store.updateMessages = vi.fn();
      
      // 模拟updateSyncStatus方法
      // @ts-ignore - 替换私有方法用于测试
      store.updateSyncStatus = vi.fn().mockResolvedValue(undefined);
      
      // 获取消息
      const result = await store.getMessages(0, 3);
      
      // API应该被调用获取最新消息
      expect(mockApi.chat.chatList).toHaveBeenCalledWith('topic1', 0, 3);
      
      // 应该更新了本地消息
      // @ts-ignore - 访问方法用于测试
      expect(store.updateMessages).toHaveBeenCalled();
    });
    
    it('应该正确处理获取历史消息', async () => {
      // 模拟内存中有一些消息
      const mockMessages = [];
      for (let i = 10; i >= 6; i--) {
        const msg = new ChatLog();
        msg.chatId = `msg_${i}`;
        msg.seq = i;
        msg.content = { type: 'text', text: `Message ${i}` };
        mockMessages.push(msg);
      }
      
      // @ts-ignore - 直接设置私有属性用于测试
      store.messages = mockMessages;
      
      // 模拟loadMessagesFromDB方法
      // @ts-ignore - 替换私有方法用于测试
      store.loadMessagesFromDB = vi.fn().mockImplementation((lastSeq, limit) => {
        // 模拟数据库加载更多老消息
        const dbMessages = [];
        for (let i = 5; i >= 1; i--) {
          const msg = new ChatLog();
          msg.chatId = `msg_${i}`;
          msg.seq = i;
          msg.content = { type: 'text', text: `DB Message ${i}` };
          dbMessages.push(msg);
        }
        
        // 添加到现有内存中
        // @ts-ignore - 直接设置私有属性用于测试
        store.messages = [...store.messages, ...dbMessages].sort((a, b) => b.seq - a.seq);
        return Promise.resolve();
      });
      
      // 获取历史消息，从seq=6之前的消息
      const result = await store.getMessages(6, 3);
      
      // 应该返回从IndexedDB加载的历史消息
      expect(result.logs.length).toBe(3);
      expect(result.logs[0].seq).toBe(5);  // 最新的历史消息
      expect(result.logs[1].seq).toBe(4);
      expect(result.logs[2].seq).toBe(3);
      
      // 应该调用了loadMessagesFromDB，查找seq<6的消息
      // @ts-ignore - 访问私有方法用于测试
      expect(store.loadMessagesFromDB).toHaveBeenCalledWith(6, 3);
    });
  });

  describe('updateMessages', () => {
    it('应该同时更新内存和数据库', async () => {
      // 模拟saveMessagesToDb方法
      // @ts-ignore - 替换私有方法用于测试
      store.saveMessagesToDb = vi.fn().mockResolvedValue(undefined);
      
      // 创建测试消息
      const messages = [];
      for (let i = 1; i <= 3; i++) {
        const msg = new ChatLog();
        msg.chatId = `msg_${i}`;
        msg.seq = i;
        msg.content = { type: 'text', text: `Test Message ${i}` };
        messages.push(msg);
      }
      
      // 更新消息
      await store.updateMessages(messages);
      
      // 验证saveMessagesToDb被调用
      // @ts-ignore - 访问私有方法用于测试
      expect(store.saveMessagesToDb).toHaveBeenCalledWith(messages);
      
      // 验证内存中的消息被更新
      expect(store.messages.length).toBe(3);
    });
  });

  describe('初始化同步', () => {
    it('应该在首次打开时进行初始同步', async () => {
      // 模拟初始同步状态
      // @ts-ignore - 直接设置私有属性用于测试
      store.isInitialSync = true;
      // @ts-ignore - 直接设置私有属性用于测试
      store.syncStatus = { topicId: 'topic1', lastSeq: 5, hasMore: false, updatedAt: new Date().toISOString() };
      
      // 模拟fetchMessagesFromServerAndUpdate方法
      // @ts-ignore - 替换私有方法用于测试
      store.fetchMessagesFromServerAndUpdate = vi.fn().mockResolvedValue({
        logs: [], 
        hasMore: false
      });
      
      // 模拟updateSyncStatus方法
      // @ts-ignore - 替换私有方法用于测试  
      store.updateSyncStatus = vi.fn().mockResolvedValue(undefined);
      
      // 执行初始同步
      await store.initSync(10);  // 服务器最新seq是10
      
      // 验证fetchMessagesFromServerAndUpdate被调用获取最新消息
      // @ts-ignore - 访问私有方法用于测试
      expect(store.fetchMessagesFromServerAndUpdate).toHaveBeenCalledWith(0, 20);
      
      // 验证初始同步标记被重置
      // @ts-ignore - 访问私有属性用于测试
      expect(store.isInitialSync).toBe(false);
    });
  });
}); 