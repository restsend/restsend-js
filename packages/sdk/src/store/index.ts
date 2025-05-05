import { User, Topic, ChatLog, Conversation } from "../types";

export const MessageBucketSize = 50;

export interface IMessageStore {
  getMessages(lastSeq: number, limit: number): Promise<{ logs: ChatLog[]; hasMore: boolean }>;

  getMessagesFromCache(lastSeq: number, limit?: number): ChatLog[] | undefined;

  updateMessages(items: ChatLog[]): void;

  clearMessages(): void;

  deleteMessage(chatId: string): void;

  getMessageByChatId(chatId: string): ChatLog | undefined;
}

export interface IClientStore {
  getMessageStore(topicId: string, bucketSize?: number): IMessageStore;

  getUser(userId: string, maxAge?: number): Promise<User>;

  getTopic(topicId: string, maxAge?: number): Promise<Topic>;

  getConversation(topicId: string, maxAge?: number): Promise<Conversation>;

  processIncoming(topic: Topic, logItem: ChatLog, hasRead: boolean): Conversation | undefined;

  saveIncomingLog(topicId: string, logItem: ChatLog): void;

  mergeChatLog(topic: Topic, logItem: ChatLog, hasRead: boolean): Conversation | undefined;

  updateConversation(conversation: Conversation): void;

  updateUser(userId: string, data: User): User;

  getLastSyncConversation(): Date | undefined;

  getConversations(): Record<string, Conversation>;

  setLastSyncConversation(lastSyncConversation: Date|undefined): void;
}
