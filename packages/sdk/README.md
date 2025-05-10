# IndexedDB 消息存储

本库提供了基于 IndexedDB 的消息存储实现，支持离线缓存和持久化存储。

## 功能特点

- 基于 IndexedDB 存储消息，支持离线访问
- 与现有的内存缓存机制兼容
- 自动同步和管理消息状态
- 在网络恢复后自动与服务器同步

## 使用方法

### 使用 IndexedDB 客户端

最简单的方式是使用 `createIndexedDBClient` 函数直接创建一个带有 IndexedDB 存储的客户端:

```typescript
import { createIndexedDBClient, Callback } from "@resetsend/sdk";

// 创建回调
const callback: Callback = {
  onConnected: () => {
    console.log("连接成功");
  },
  onTopicMessage: (topic, message) => {
    console.log("收到消息:", message);
    return { code: 200, hasRead: true };
  },
  // 其他回调...
};

// 创建基于 IndexedDB 的客户端
const client = createIndexedDBClient("https://api.example.com", callback);

// 登录
await client.login("username", "password");

// 开始同步会话
client.beginSyncConversations(50);
```

### 手动创建和配置

如果你需要更多的控制或自定义配置，可以手动创建和配置组件：

```typescript
import { 
  Client, 
  createApis, 
  IndexedDBClientStore, 
  IndexedDBMessageStore 
} from "@resetsend/sdk";

// 创建 API 实例
const apis = createApis("https://api.example.com");

// 创建基于 IndexedDB 的客户端存储
const store = new IndexedDBClientStore(apis);

// 创建客户端
const client = new Client(apis, store, callback);

// 现在你可以使用 client 进行操作了
```

## 技术细节

### IndexedDBMessageStore

`IndexedDBMessageStore` 扩展自 `MessageStore`，它将消息存储在 IndexedDB 中，并提供以下功能：

- 自动在内存和 IndexedDB 之间同步消息
- 在应用重新启动时从 IndexedDB 加载缓存的消息
- 支持在没有网络连接的情况下查看历史消息

### IndexedDBClientStore

`IndexedDBClientStore` 扩展自 `ClientStore`，它使用 `IndexedDBMessageStore` 替代默认的 `MessageStore`，让整个客户端存储系统都支持 IndexedDB 持久化。

## 离线支持

使用 IndexedDB 存储后，即使在离线状态下，用户也可以查看之前缓存的消息。当网络恢复后，客户端会自动同步新消息。

## 浏览器兼容性

IndexedDB 在所有现代浏览器中都得到支持，包括：

- Chrome 80+
- Firefox 74+
- Safari 13.1+
- Edge 80+

## 限制

- IndexedDB 存储受到浏览器存储限制的约束，通常每个域名可以使用数百 MB 的存储空间
- 在隐私浏览模式下，IndexedDB 可能不可用或在会话结束时被清除 