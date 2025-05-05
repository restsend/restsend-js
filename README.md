# Resetsend TypeScript SDK 聊天演示

这是一个使用 TypeScript 版 Resetsend SDK 的 React 应用，展示了如何使用 SDK 进行即时通讯应用开发。

## 功能特点

- 用户认证（普通用户和访客模式）
- 会话管理和显示
- 发送和接收文本消息
- 文件和图片上传/分享
- 消息引用/回复
- 消息撤回和删除
- 实时状态更新（输入中、已读等）

## 开发技术

- TypeScript
- React
- Vite
- Tailwind CSS

## 项目结构

本项目使用 pnpm workspace 进行管理

```
resetsend-typescript-sdk/
├── packages/
│   ├── sdk/               # IM SDK 库，可独立发布到 npm
│   │   ├── src/           # SDK 源码
│   │   │   ├── network/   # 网络通信相关
│   │   │   ├── services/  # 服务模块
│   │   │   ├── store/     # 状态管理
│   │   │   ├── utils/     # 工具函数
│   │   │   ├── client.ts  # 客户端核心实现
│   │   │   └── types.ts   # 类型定义
│   │   └── dist/          # 构建输出目录
│   │
│   └── demo/              # 使用 SDK 的 Demo 项目
│       ├── src/           # 示例应用源码
│       │   ├── components/# React 组件
│       │   ├── App.tsx    # 应用入口
│       │   └── main.tsx   # React 挂载点
│       └── public/        # 静态资源
└── 其他配置文件 (.gitignore, package.json 等)
```

## 运行项目

1. 安装依赖：

```bash
pnpm install
```

2. 开发 SDK 或 Demo：

```bash
# 开发 SDK
pnpm dev:sdk

# 开发 Demo
pnpm dev:demo
```

3. 在浏览器中访问：http://localhost:5173/

## 构建项目

执行以下命令构建产品版本：

```bash
# 构建 SDK
pnpm build:sdk

# 构建 Demo
pnpm build:demo

# 构建全部
pnpm build
```

构建结果会输出到对应的 `dist` 目录。

## 使用 TypeScript SDK

### 基本用法

```typescript
import { createRsClient } from '@resetsend/sdk';

// 创建客户端实例
const client = createRsClient('https://your-api-endpoint');

// 用户登录
await client.login({ username: 'user', password: 'password' });

// 连接到服务器
await client.connect();

// 注册事件处理器
client.onConnected = () => console.log('已连接');
client.onConversationUpdated = (conversation) => console.log('会话更新', conversation);
client.onTopicMessage = (topic, message) => console.log('收到消息', message);

// 开始同步会话列表
client.beginSyncConversations();

// 发送文本消息
await client.doSendText({ 
  topicId: 'topic-id', 
  text: '你好，世界！' 
});
```

### 主要接口

- `Client` - SDK 的核心类，提供所有通信功能
- `Conversation` - 表示一个会话
- `ChatLog` - 表示一条消息
- `Topic` - 表示一个主题（个人或群组）
- `User` - 表示一个用户
