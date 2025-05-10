import 'fake-indexeddb/auto';
import { afterAll } from '@jest/globals';

// 当测试运行结束后清理模拟的IndexedDB
afterAll(async () => {
  try {
    // 删除所有数据库
    const databases = await window.indexedDB.databases();
    
    // 使用 Promise.all 并行处理所有删除操作
    await Promise.all(databases.map(db => {
      if (db.name) {
        return new Promise<void>((resolve) => {
          try {
            const request = window.indexedDB.deleteDatabase(db.name!);
            
            // 设置超时，确保即使删除操作卡住，测试也能结束
            const timeout = setTimeout(() => {
              console.warn(`删除数据库超时: ${db.name}`);
              resolve();
            }, 2000);
            
            request.onerror = (event) => {
              clearTimeout(timeout);
              console.warn(`删除数据库出错: ${db.name}`, event);
              resolve();
            };
            
            request.onsuccess = () => {
              clearTimeout(timeout);
              resolve();
            };
          } catch (error) {
            console.error('删除数据库异常:', error);
            resolve();
          }
        });
      }
      return Promise.resolve();
    }));
  } catch (error) {
    console.error('清理IndexedDB时出错:', error);
  }
}); 