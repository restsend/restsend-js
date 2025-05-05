/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * 话题/群组服务接口
 */
export interface ITopicApi {
  /**
   * 与用户聊天
   * @param userId 用户ID
   */
  chatWithUser(userId: string): Promise<any>;

  /**
   * 获取单个聊天会话的信息
   * @param topicId 话题ID
   */
  getTopic(topicId: string): Promise<any>;

  /**
   * 同步话题成员信息
   * @param topicId 话题ID
   * @param updatedAt 更新时间
   * @param limit 限制数量
   */
  syncTopicMembers(topicId: string, updatedAt: string, limit: number): Promise<any>;

  /**
   * 创建话题聊天
   * @param name 名称
   * @param icon 图标
   * @param members 成员
   */
  createTopic(name: string, icon: string, members: string[]): Promise<any[]>;

  /**
   * 申请加入话题聊天
   * @param topicId 话题ID
   * @param source 来源
   * @param message 消息
   * @param memo 备注
   */
  joinTopic(topicId: string, source: string, message: string, memo: string): Promise<any[]>;

  /**
   * 获取话题申请列表，这未被调用
   * @param params 参数
   */
  getTopicApplyList(params: any): Promise<any[]>;

  /**
   * 获取所有话题聊天申请列表
   */
  getAllTopicApplyList(): Promise<any[]>;

  /**
   * 接受话题聊天申请
   * @param params 参数
   */
  acceptTopic(params: any): Promise<any[]>;

  /**
   * 解散话题聊天
   * @param topicId 话题ID
   */
  dismissTopic(topicId: string): Promise<any[]>;

  /**
   * 更新话题通知
   * @param topicId 话题ID
   * @param text 文本
   */
  updateTopicNotice(topicId: string, text: string): Promise<any[]>;

  /**
   * 静音整个话题，如果持续时间为0则取消静音
   * @param topicId 话题ID
   * @param duration 持续时间
   */
  silentTopic(topicId: string, duration: string): Promise<any>;

  /**
   * 静音话题成员，如果持续时间为0则取消静音
   * @param topicId 话题ID
   * @param userId 用户ID
   * @param duration 持续时间
   */
  silentTopicMember(topicId: string, userId: string, duration: string): Promise<any>;

  /**
   * 移除话题成员
   * @param topicId 话题ID
   * @param userId 用户ID
   */
  removeTopicMember(topicId: string, userId: string): Promise<any>;
}
