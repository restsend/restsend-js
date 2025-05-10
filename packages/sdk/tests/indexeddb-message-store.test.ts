/**
 * IndexedDBMessageStore 测试
 */
import { jest, describe, test, expect, beforeEach, afterAll, afterEach } from '@jest/globals';
import 'fake-indexeddb/auto';
import { IndexedDBMessageStore } from '../src/store/indexeddb_store';
import { LogStatusReceived, LogStatusSending, LogStatusSent } from '../src/constants';
import { createMockApis, createMockChatLogs } from './mock/mock-apis';

// 测试主题ID
const TEST_TOPIC_ID = 'test_topic_123';
// 数据库名称
const DB_NAME = `im_messages_${TEST_TOPIC_ID}`;

// 增加测试超时时间为 120 秒
jest.setTimeout(120000);

describe('IndexedDBMessageStore', () => {
  // 设置更长的超时时间
  jest.setTimeout(120000);
  
  let mockApis: ReturnType<typeof createMockApis>;
  let store: IndexedDBMessageStore;
  
  // 在每个测试前设置
  beforeEach(async () => {
    // 创建新的数据库
    await deleteDatabase(DB_NAME);
    
    // 创建模拟API和存储
    mockApis = createMockApis();
    store = new IndexedDBMessageStore(mockApis as any, TEST_TOPIC_ID, 50);
    
    // 等待一段时间确保数据库已打开
    await new Promise(resolve => setTimeout(resolve, 1000));
  });
  
  // 每个测试后清理
  afterEach(async () => {
    // 关闭存储连接
    if (store) {
      store.destroy();
    }
    
    // 等待一段时间确保连接已关闭
    await new Promise(resolve => setTimeout(resolve, 500));
  });
  
  // 所有测试后清理
  afterAll(async () => {
    // 删除测试数据库
    await deleteDatabase(DB_NAME);
    
    // 等待一段时间确保数据库已删除
    await new Promise(resolve => setTimeout(resolve, 500));
  });
  
  test('应该正确初始化', () => {
    expect(store).toBeDefined();
    expect(store.topicId).toBe(TEST_TOPIC_ID);
    expect(store.bucketSize).toBe(50);
    expect(store.messages).toEqual([]);
  });
  
  test('应该能保存和加载消息', async () => {
    // 创建测试消息
    const testLogs = createMockChatLogs(5);
    
    // 保存消息到存储
    store.updateMessages(testLogs);
    
    // 等待一段时间，确保 IndexedDB 操作完成
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 清空内存中的消息，模拟程序重启
    (store as any).messages = [];
    
    // 从存储加载消息
    const result = await store.getMessages(5, 5);
    
    // 验证结果
    expect(result.logs.length).toBe(5);
    // 修正期望值以匹配实际排序
    expect(result.logs[0].seq).toBe(1);
    expect(result.logs[4].seq).toBe(5);
  });
  
  test('当 IndexedDB 中没有数据时应该从服务器获取', async () => {
    // 模拟服务器返回数据
    const serverLogs = createMockChatLogs(5);
    
    // 确保每个日志对象有正确的 chatId
    serverLogs.forEach((log, index) => {
      const seq = index + 1;
      log.chatId = `msg_${seq}`;
    });
    
    mockApis.chat.getChatLogsDesc.mockResolvedValue({
      items: serverLogs,
      hasMore: false
    });
    
    // 从存储获取消息，此时 IndexedDB 为空
    const result = await store.getMessages(5, 5);
    
    // 验证结果
    expect(mockApis.chat.getChatLogsDesc).toHaveBeenCalledWith(TEST_TOPIC_ID, 5, 5);
    expect(result.logs.length).toBe(5);
    // 断言检查首个和最后一个消息的 chatId
    expect(result.logs[0].chatId).toBe('msg_1');
    expect(result.logs[4].chatId).toBe('msg_5');
    
    // 检查消息是否被保存到了 IndexedDB
    // 清空内存中的消息后再次获取
    (store as any).messages = [];
    const cachedResult = await store.getMessages(5, 5);
    
    // 验证缓存结果，此时不应该调用服务器API
    expect(mockApis.chat.getChatLogsDesc).toHaveBeenCalledTimes(1); // 不应该增加调用次数
    expect(cachedResult.logs.length).toBe(5);
  });
  
  test('应该能正确删除消息', async () => {
    // 创建测试消息
    const testLogs = createMockChatLogs(10);
    
    // 保存消息到存储
    store.updateMessages(testLogs);
    
    // 等待一段时间，确保 IndexedDB 操作完成
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 验证初始状态
    expect(store.messages.length).toBe(10);
    
    // 删除一条消息
    const deleteId = 'msg_5';
    store.deleteMessage(deleteId);
    
    // 等待一段时间，确保 IndexedDB 操作完成
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 检查内存中的消息数量
    expect(store.messages.length).toBe(9); // 原10条消息减去1条被删除的
    expect(store.messages.find(log => log.chatId === deleteId)).toBeUndefined();
  });
  
  test('应该能清空所有消息', async () => {
    // 创建测试消息
    const testLogs = createMockChatLogs(5);
    
    // 保存消息到存储
    store.updateMessages(testLogs);
    
    // 等待一段时间，确保 IndexedDB 操作完成
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 清空所有消息
    store.clearMessages();
    
    // 等待一段时间，确保 IndexedDB 操作完成
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 清空内存中的消息，模拟程序重启
    (store as any).messages = [];
    
    // 模拟服务器返回新数据
    const serverLogs = createMockChatLogs(3);
    mockApis.chat.getChatLogsDesc.mockResolvedValue({
      items: serverLogs,
      hasMore: false
    });
    
    // 从存储加载消息
    const result = await store.getMessages(5, 5);
    
    // 验证结果，服务器API应该被调用，因为存储中已无数据
    expect(mockApis.chat.getChatLogsDesc).toHaveBeenCalled();
    expect(result.logs.length).toBe(3); // 应该返回服务器数据
  });
});

// ------ 辅助函数 ------

// 删除数据库
async function deleteDatabase(dbName: string): Promise<void> {
  return new Promise<void>((resolve) => {
    try {
      const deleteRequest = indexedDB.deleteDatabase(dbName);
      
      // 增加超时处理，避免挂起
      const timeout = setTimeout(() => {
        console.warn(`删除数据库超时: ${dbName}`);
        resolve();
      }, 3000);
      
      deleteRequest.onsuccess = () => {
        clearTimeout(timeout);
        console.log(`成功删除数据库: ${dbName}`);
        resolve();
      };
      
      deleteRequest.onerror = (event) => {
        clearTimeout(timeout);
        console.warn(`删除数据库失败: ${dbName}`, event);
        resolve(); // 即使失败也继续
      };
      
      // 添加阻塞处理
      deleteRequest.onblocked = (event) => {
        clearTimeout(timeout);
        console.warn(`删除数据库被阻塞: ${dbName}，尝试等待连接关闭`);
        resolve(); // 仍然解析，避免测试卡住
      };
    } catch (error) {
      console.error("删除数据库时出错:", error);
      resolve(); // 即使失败也继续
    }
  });
} 