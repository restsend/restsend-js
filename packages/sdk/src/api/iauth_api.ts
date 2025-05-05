import { User } from "../types";

/**
 * 认证服务接口
 */
export interface IAuthApi {
  /**
   * 用户登出
   */
  logout(): Promise<any>;

  /**
   * 用户注册
   * @param email 邮箱
   * @param password 密码
   * @param remember 是否记住登录
   */
  signup(email: string, password: string, remember?: boolean): Promise<any>;

  /**
   * 访客登录
   * @param guestId 访客ID
   * @param remember 是否记住登录
   * @param extra 额外参数
   */
  guestLogin(guestId: string, remember?: boolean, extra?: any): Promise<User>;

  /**
   * 用户登录
   * @param email 邮箱
   * @param password 密码
   * @param remember 是否记住登录
   */
  login(email: string, password: string, remember?: boolean): Promise<User>;

  /**
   * 使用令牌登录
   * @param email 邮箱
   * @param token 令牌
   */
  loginWithToken(email: string, token: string): Promise<User>;

  /**
   * 获取我的ID
   */
  getMyId(): string;

  /**
   * 获取认证令牌
   */
  getAuthToken(): string;
}
