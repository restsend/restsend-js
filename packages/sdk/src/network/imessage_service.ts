/**
 * 消息服务接口
 */
export interface IMessageService {

  doSend(params: GenericMessageParams): Promise<void>;

  doTyping(topicId: string): Promise<void>;

  doRead({ topicId, lastSeq }: ReadMessageParams): Promise<void>;

  /**
   * 发送文本消息
   * @param params 文本消息参数
   */
  doSendText(params: TextMessageParams): Promise<void>;
  /**
   * 发送图片消息
   * @param params 图片消息参数
   */
  doSendImage(params: ImageMessageParams): Promise<void>;
  /**
   * 发送语音消息
   * @param params 语音消息参数
   */
  doSendVoice(params: VoiceMessageParams): Promise<void>;
  /**
   * 发送视频消息
   * @param params 视频消息参数
   */
  doSendVideo(params: VideoMessageParams): Promise<void>;
  /**
   * 发送文件消息
   * @param params 文件消息参数
   */
  doSendFile(params: FileMessageParams): Promise<void>;
  /**
   * 撤回消息
   * @param params 撤回消息参数
   */
  doRecall(params: RecallMessageParams): Promise<void>;

  /**
   * 删除消息
   * @param topicId 对话ID
   * @param chatId 消息ID
   */
  deleteMessage(topicId: string, chatId: string): Promise<void>;
}

/**
 * 基础消息参数接口
 */
export interface BaseMessageParams {
  /** 对话ID */
  topicId: string;
  /** 自定义扩展数据 */
  extra?: Record<string, any>;
}

/**
 * 回调函数参数接口
 */
export interface CallbackParams {
  /** 发送成功回调 */
  onsent?: Function;
  /** 消息确认回调 */
  onack?: Function;
  /** 发送失败回调 */
  onfail?: Function;
}

/**
 * 文本消息参数接口
 */
export interface TextMessageParams extends BaseMessageParams, CallbackParams {
  /** 文本内容 */
  text: string;
  /** 提及的用户ID数组 */
  mentions?: string[];
  /** 回复的消息ID */
  reply?: string;
}

/**
 * 媒体消息基础参数接口
 */
export interface MediaMessageParams extends BaseMessageParams, CallbackParams {
  /** 媒体URL或数据 */
  urlOrData: string;
  /** 提及的用户ID数组 */
  mentions?: string[];
  /** 回复的消息ID */
  reply?: string;
}

/**
 * 图片消息参数接口
 */
export interface ImageMessageParams extends MediaMessageParams {
  /** 图片大小 */
  size?: number;
}

/**
 * 语音消息参数接口
 */
export interface VoiceMessageParams extends MediaMessageParams {
  /** 语音时长 */
  duration: string;
}

/**
 * 视频消息参数接口
 */
export interface VideoMessageParams extends VoiceMessageParams {
  /** 视频缩略图 */
  thumbnail: string;
}

/**
 * 文件消息参数接口
 */
export interface FileMessageParams extends MediaMessageParams {
  /** 文件名 */
  filename: string;
  /** 文件大小 */
  size: number;
}

/**
 * 位置消息参数接口
 */
export interface LocationMessageParams extends BaseMessageParams, CallbackParams {
  /** 纬度 */
  latitude: number;
  /** 经度 */
  longitude: number;
  /** 地址 */
  address: string;
  /** 提及的用户ID数组 */
  mentions?: string[];
  /** 回复的消息ID */
  reply?: string;
}

/**
 * 链接消息参数接口
 */
export interface LinkMessageParams extends BaseMessageParams, CallbackParams {
  /** 链接URL */
  url: string;
  /** 提及的用户ID数组 */
  mentions?: string[];
  /** 回复的消息ID */
  reply?: string;
}

/**
 * 通用消息参数接口
 */
export interface GenericMessageParams extends BaseMessageParams, CallbackParams {
  [key: string]: any; // 允许任意字段
  /** 消息类型 */
  type: string;
  /** 消息内容 */
  text: string;
  /** 提及的用户ID数组 */
  mentions?: string[];
  /** 回复的消息ID */
  reply?: string;
}

/**
 * 撤回消息参数接口
 */
export interface RecallMessageParams extends BaseMessageParams, CallbackParams {
  /** 要撤回的消息ID */
  chatId: string;
}

/**
 * 更新消息扩展参数接口
 */
export interface UpdateExtraParams extends BaseMessageParams, CallbackParams {
  /** 要更新的消息ID */
  chatId: string;
  /** 扩展数据 */
  extra: Record<string, any>;
}

/**
 * 已读消息参数接口
 */
export interface ReadMessageParams {
  /** 对话ID */
  topicId: string;
  /** 最后序列号 */
  lastSeq: number;
}

/**
 * 正在输入参数接口
 */
export interface TypingParams {
  /** 对话ID */
  topicId: string;
}
