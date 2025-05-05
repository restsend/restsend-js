import { BackendService } from "../adapter/backend";
import { IChatApi } from "../ichat_api";

export class ChatApi implements IChatApi {
  constructor(private readonly backend: BackendService) {
    this.backend = backend;
  }

  // Get chat list
  async getChatList(updatedAt?: Date, limit?: number) {
    return await this.backend.post(`/api/chat/list`, { updatedAt, limit });
  }

  // Remove from chat list
  async removeChat(topicId: string) {
    return await this.backend.post(`/api/chat/remove/${topicId}`);
  }

  /**
   * Get information of a single chat session
   * @param {String} topicId
   * */
  async getConversation(topicId: string) {
    return await this.backend.post(`/api/chat/info/${topicId}`);
  }

  // Allow a user to chat with me
  async allowChatWithUser(userId: string) {
    return await this.backend.post(`/api/relation/${userId}`, {
      chatAllowed: true,
    });
  }

  // Get chat logs in descending order, sync messages in chat conversations (single and group chat)
  async getChatLogsDesc(topicId: string, lastSeq: number, limit: number) {
    return await this.backend.post(`/api/chat/sync/${topicId}`, { lastSeq, limit });
  }
  /**
   * Delete message in chat
   * @param {String} topicId
   * @param {String} chatId
   */
  async deleteMessage(topicId: string, chatId: string) {
    const body = {
      ids: [chatId],
    };
    return await this.backend.post(`/api/chat/remove_messages/${topicId}`, body);
  }
}
