import { BackendService } from "./adapter/backend";
import { AuthApi } from "./impl/auth_api";
import { ChatApi } from "./impl/chat_api";
import { ExtraApi } from "./impl/extra_api";
import { TopicApi } from "./impl/topic_api";
import { UserApi } from "./impl/user_api";

export * from "./iauth_api";
export * from "./ichat_api";
export * from "./iextra_api";

export * from "./itopic_api";
export * from "./iuser_api";

export const createAuthApi = (backend: BackendService) => new AuthApi(backend);
export const createChatApi = (backend: BackendService) => new ChatApi(backend);
export const createExtraApi = (backend: BackendService) => new ExtraApi(backend);
export const createTopicApi = (backend: BackendService) => new TopicApi(backend);
export const createUserApi = (backend: BackendService) => new UserApi(backend);

export interface IAllApi {
  auth: AuthApi;
  chat: ChatApi;
  extra: ExtraApi;
  topic: TopicApi;
  user: UserApi;
  /**
   * 发送POST请求
   * @param url 请求地址
   * @param data 请求数据
   * @returns 响应数据
   */
  post: (url: string, data?: any) => Promise<any>;
  /**
   * 发送GET请求
   * @param url 请求地址
   * @returns 响应数据
   */
  get: (url: string) => Promise<any>;
}

/**
 * 创建API实例
 * @param endpoint 后端服务地址
 * @returns API实例
 */
export const createApis = (endpoint: string): IAllApi => {
  const backend = new BackendService(endpoint);
  return {
    auth: createAuthApi(backend),
    chat: createChatApi(backend),
    extra: createExtraApi(backend),
    topic: createTopicApi(backend),
    user: createUserApi(backend),
    post: (url, data) => backend.post(url, data),
    get: (url) => backend.get(url),
  };
};
