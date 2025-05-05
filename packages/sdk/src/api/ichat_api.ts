/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * 聊天会话服务接口
 */
export interface IChatApi {


  /**
   * 获取聊天列表
   * @param updatedAt 更新时间
   * @param limit 限制数量
   */
  getChatList(updatedAt?: Date, limit?: number): Promise<any>;

  /**
   * 从聊天列表中移除
   * @param topicId 话题ID
   */
  removeChat(topicId: string): Promise<any>;

  /**
   * 获取单个聊天会话的信息
   * @param topicId 话题ID
   */
  getConversation(topicId: string): Promise<any>;

  /**
   * 允许用户与我聊天
   * @param userId 用户ID
   */
  allowChatWithUser(userId: string): Promise<any>;

    /**
   * 按降序获取聊天记录，同步聊天对话中的消息（单聊和群聊）
   * @param topicId 话题ID
   * @param lastSeq 最后序列号
   * @param limit 限制数量
   */
    getChatLogsDesc(topicId: string, lastSeq: number, limit: number): Promise<any>;

    /**
     * 删除聊天中的消息
     * @param topicId 话题ID
     * @param chatId 聊天ID
     */
    deleteMessage(topicId: string, chatId: string): Promise<any>;
} 