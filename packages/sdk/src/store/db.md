
## IndexedDB 数据存储和查询方案

### 数据库结构设计


```javascript
// IndexedDB 数据库结构
const dbName = "restsend_chat_db";
const dbVersion = 1;

// 数据库初始化
function initDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // 聊天记录存储
      if (!db.objectStoreNames.contains("chatLogs")) {
        const chatLogsStore = db.createObjectStore("chatLogs", { keyPath: ["topicId", "seq"] });
        chatLogsStore.createIndex("by_topic_seq", ["topicId", "seq"], { unique: true });
        chatLogsStore.createIndex("by_topic_id", ["topicId", "id"], { unique: true });
        chatLogsStore.createIndex("by_topic", "topicId", { unique: false });
      }
      
      // 会话信息存储
      if (!db.objectStoreNames.contains("conversations")) {
        const conversationsStore = db.createObjectStore("conversations", { keyPath: "topicId" });
        conversationsStore.createIndex("by_updated_at", "updatedAt", { unique: false });
      }
      
      // 同步状态存储 - 记录每个话题的最后同步状态
      if (!db.objectStoreNames.contains("syncStatus")) {
        const syncStatusStore = db.createObjectStore("syncStatus", { keyPath: "topicId" });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}
```

### 数据同步方案

基于后端的 handleChatLogSync 实现，我们需要设计相应的客户端缓存和查询策略

```javascript
// 从服务器同步消息并更新本地缓存
async function syncChatLogsFromServer(topicId, lastSeq = 0, limit = 50) {
  try {
    // 1. 从服务器获取数据

    
    // 2. 更新本地缓存
    const db = await initDatabase();
    const tx = db.transaction(['chatLogs', 'syncStatus'], 'readwrite');
    const chatLogsStore = tx.objectStore('chatLogs');
    const syncStatusStore = tx.objectStore('syncStatus');
    
    // 保存聊天记录
    for (const chatLog of result.items) {
      await chatLogsStore.put(chatLog);
    }
    
    // 更新同步状态
    await syncStatusStore.put({
      topicId: topicId,
      lastSeq: result.lastSeq,
      updatedAt: result.updatedAt,
      hasMore: result.hasMore
    });
    
    await tx.complete;
    
    return result;
  } catch (error) {
    console.error('同步聊天记录失败:', error);
    throw error;
  }
}

// 从本地缓存获取消息，如果没有或不足则从服务器获取
async function getChatLogs(topicId, lastSeq = 0, limit = 20) {
  const db = await initDatabase();
  const tx = db.transaction(['chatLogs', 'syncStatus'], 'readonly');
  const chatLogsStore = tx.objectStore('chatLogs');
  const syncStatusStore = tx.objectStore('syncStatus');
  
  // 获取同步状态
  const syncStatus = await syncStatusStore.get(topicId);
  
  // 查询本地缓存
  const range = IDBKeyRange.bound(
    [topicId, lastSeq > 0 ? 0 : 0],
    [topicId, lastSeq > 0 ? lastSeq : Infinity],
    false,
    lastSeq > 0 ? false : true
  );
  
  const index = chatLogsStore.index('by_topic_seq');
  const localChatLogs = await index.getAll(range, limit);
  
  // 本地数据排序
  localChatLogs.sort((a, b) => b.seq - a.seq);
  
  // 检查是否需要从服务器获取更多数据
  const shouldFetchFromServer = 
    !syncStatus || // 从未同步过
    localChatLogs.length < limit || // 本地数据不足
    (lastSeq > 0 && (!syncStatus.hasMore || syncStatus.lastSeq < lastSeq)); // 需要获取更早消息
  
  if (shouldFetchFromServer) {
    // 从服务器获取数据并更新本地缓存
    return await syncChatLogsFromServer(topicId, lastSeq, limit);
  } else {
    // 使用本地缓存结果
    const lastLog = localChatLogs[localChatLogs.length - 1];
    return {
      topicId: topicId,
      items: localChatLogs,
      lastSeq: lastLog ? lastLog.seq : 0,
      updatedAt: lastLog ? lastLog.createdAt : new Date(),
      hasMore: syncStatus ? syncStatus.hasMore : false
    };
  }
}

// 发送新消息后更新本地缓存
async function updateLocalCacheAfterSend(chatLog) {
  const db = await initDatabase();
  const tx = db.transaction(['chatLogs', 'conversations'], 'readwrite');
  
  // 保存消息到本地
  await tx.objectStore('chatLogs').put(chatLog);
  
  // 更新会话信息
  const conversationStore = tx.objectStore('conversations');
  const conversation = await conversationStore.get(chatLog.topicId) || {
    topicId: chatLog.topicId,
    lastMessageAt: new Date(),
    updatedAt: new Date()
  };
  
  conversation.lastMessage = chatLog.content;
  conversation.lastMessageSeq = chatLog.seq;
  conversation.lastMessageAt = chatLog.createdAt;
  conversation.lastSenderId = chatLog.senderId;
  conversation.updatedAt = new Date();
  
  await conversationStore.put(conversation);
  
  await tx.complete;
}
```
