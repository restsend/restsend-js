import { User, Topic, ChatLog, Conversation } from "../types";
import { formatDate } from ".";

/**
 * 获取用户的显示名称
 * @param user User 对象
 * @returns 格式化后的显示名称
 */
export function getUserDisplayName(
  user: Pick<User, "name" | "remark" | "id" | "firstName">
): string {
  let name = user.name || user.firstName || user.id;
  if (user.remark) {
    name = `${user.remark}(${name})`;
  }
  return name;
}

/**
 * 比较两条聊天记录的顺序
 * @param a 第一条聊天记录
 * @param b 第二条聊天记录
 * @returns 比较结果
 */
export function compareChatLogs(a: ChatLog, b: ChatLog): number {
  if (a.seq === b.seq) {
    const lhsDate = formatDate(a.createdAt);
    const rhsDate = formatDate(b.createdAt);
    return lhsDate.getTime() - rhsDate.getTime();
  }
  return (a.seq || 0) - (b.seq || 0);
}

/**
 * 从话题和聊天记录创建会话对象
 * @param topic 话题对象
 * @param logItem 聊天记录项
 * @returns 会话对象
 */
export function conversationFromTopic(topic: Topic, logItem?: ChatLog): Conversation {
  const conversation = {
    topicId: topic.id,
    ownerId: topic.ownerId,
    multiple: topic.multiple,
    name: topic.name,
    remark: topic.remark,
    icon: topic.icon,
    topic: { ...topic },
  } as Conversation;

  if (logItem && logItem.readable) {
    conversation.lastSenderId = logItem.senderId;
    conversation.lastMessage = logItem.content;
    conversation.lastMessageAt = logItem.createdAt;
    conversation.lastMessageSeq = logItem.seq;
    if (logItem.seq && (conversation.lastSeq === undefined || logItem.seq > conversation.lastSeq)) {
      conversation.lastSeq = logItem.seq;
    }
  }

  return conversation;
}

/**
 * 比较两个会话的排序
 * @param a 第一个会话
 * @param b 第二个会话
 * @returns 比较结果
 */
export function compareConversations(a: Conversation, b: Conversation): number {
  const lhsDate = formatDate(a.lastMessageAt || a.updatedAt);
  const rhsDate = formatDate(b.lastMessageAt || b.updatedAt);
  return rhsDate.getTime() - lhsDate.getTime();
}

/**
 * 构建会话对象，设置动态属性 TODO: 需要优化
 * @param conversation 会话对象
 * @param client 客户端对象（需要有 getUser 方法）
 * @returns 处理后的会话对象
 */
export function buildConversation(conversation: Conversation): Conversation {
  if (!conversation.updatedAt && conversation.createdAt) {
    conversation.updatedAt = conversation.createdAt;
  }

  return conversation;
}

/**
 * 为会话设置动态属性（名称和图标）
 * 需要在客户端代码中使用，因为需要定义动态属性
 *
 * @example
 * // 在客户端代码中使用：
 * if (conversation.lastSenderId) {
 *   Object.defineProperty(conversation.lastMessage, 'sender', {
 *     get: async () => {
 *       return await client.getUser(conversation.lastSenderId);
 *     }
 *   });
 * }
 *
 * if (!conversation.multiple && conversation.attendee) {
 *   Object.defineProperty(conversation, 'name', {
 *     get: async () => {
 *       let attendee = await client.getUser(conversation.attendee);
 *       return attendee.displayName;
 *     }
 *   });
 *   Object.defineProperty(conversation, 'icon', {
 *     get: async () => {
 *       let attendee = await client.getUser(conversation.attendee);
 *       return attendee.avatar;
 *     }
 *   });
 * }
 */
