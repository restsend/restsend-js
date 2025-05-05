/* eslint-disable @typescript-eslint/no-explicit-any */
import { User } from "../types";

/**
 * 用户关系服务接口
 */
export interface IUserApi {
  /**
   * 设置黑名单
   * @param userId 用户ID
   */
  setBlocked(userId: string): Promise<any[]>;

  /**
   * 从黑名单中移除
   * @param userId 用户ID
   */
  unsetBlocked(userId: string): Promise<any[]>;

  /**
   * 查看个人信息
   * @param userId 用户ID
   */
  getUserInfo(userId: string): Promise<Partial<User>>;
} 