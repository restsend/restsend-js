import { IAllApi } from "./api";

import { IClientStore } from "./store";
import { User } from "./types";



export interface IClient {
  /**
   * 开始同步对话
   * @param limit 限制数量
   */
  beginSyncConversations(limit: number): void;

  /**
   * 同步聊天日志
   * @param topicId 话题ID
   * @param lastSeq 最后一条日志的序列号
   * @param limit 限制数量
   */
  syncChatlogs(topicId: string, lastSeq: number, limit: number): void;

  /**
   * 获取 API 接口
   * @returns {IAllApi} API 接口
   */
  getApis(): IAllApi;

  /**
   * 获取客户端存储
   * @returns {IClientStore} 客户端存储
   */
  getStore(): IClientStore;

  /**
   * 连接到服务器
   */
  connect(): void;

  /**
   * 关闭客户端
   */
  shutdown(): void;

  /**
   * 使用 guestId 登录
   * @param guestId 游客ID
   */
  guestLogin(guestId: string): Promise<User>;

  /**
   * 使用用户名和密码登录
   * @param username 用户名
   * @param password 密码
   */
  login(email: string, password: string): Promise<User>;

  /**
   * 使用 token 登录
   * @param username 用户名
   * @param token 认证令牌
   */
  loginWithToken(email: string, token: string): Promise<User>;

  /**
   * 获取当前登录用户的email
   * @returns {string} 当前登录用户的ID,默认就是 email
   */
  getMyId(): string;

  /**
   * 获取当前登录用户的认证令牌
   * @returns {string} 认证令牌
   */
  getAuthToken(): string;
}
