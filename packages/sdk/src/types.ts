export interface User {
  id: string;
  email: string;
  name?: string;
  /**
   * @type {String} url address
   */
  avatar?: string;
  /**
   * @type {String} e2e public key
   */
  publicKey?: string;
  /**
   * @type {String} local or contact remark
   */
  remark?: string;
  isStar?: boolean;
  locale?: string;
  city?: string;
  country?: string;
  source?: string;
  firstName?: string;
  /**
   * @type {Date} local creation time
   */
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  cachedAt: number;
  profile?: Profile;
  userId?: string;
}

export interface Profile {
  avatar: string;
  gender: string;
  city: string;
  region: string;
  country: string;
  extra: Record<string, any>;
  privateExtra: Record<string, any>;
}

export interface UserPublicProfile {
  // 必填字段
  userId: string;

  // 可选字段
  name?: string;
  remark?: string;
  avatar?: string;
  locale?: string;
  city?: string;
  country?: string;
  publicKey?: string;
  source?: string;
  memo?: string;
  extra?: string;
  isBlocked?: boolean;
  gender?: string;
  createdAt?: Date; // Go 的 *time.Time 对应 Date 类型
  authToken?: string;
  privateExtra?: {
    // Go 的 map[string]any 对应索引签名对象
    [key: string]: any;
  };
  isStaff?: boolean;
}

export interface TopicNotice {
  /**
   * @type {String} notice content
   */
  text?: string;

  /**
   * @type {String} notice publisher
   */
  publisher?: string;

  /**
   * @type {Date} publish time
   */
  updatedAt?: Date;
}

export interface Topic {
  /**
   * @type {String} group id
   */
  id: string;

  /**
   * @type {String} group name
   */
  name?: string;

  /**
   * @type {String} group avatar
   */
  icon?: string;

  /**
   * @type {String} remark
   */
  remark?: string;

  /**
   * @type {String} group owner
   */
  ownerId?: string;

  /**
   * @type {String} if it's a single chat, it's the other party's id, this field is empty for group chat
   */
  attendeeId?: string;

  /**
   * @type {Array<String>} group chat administrators
   */
  admins?: string[];

  /**
   * @type {Number} number of group members
   */
  members?: number;

  /**
   * @type {Number} last message seq
   */
  lastSeq: number;

  /**
   * @type {Number} last read message seq
   */
  lastReadSeq?: number;

  /**
   * @type {Boolean} is group chat
   */
  multiple?: boolean;

  /**
   * @type {Boolean} is private group
   */
  private?: boolean;

  /**
   * @type {String} creation time
   */
  createdAt?: string;

  /**
   * @type {Date} update time
   */
  updatedAt?: Date;

  /**
   * @type {TopicNotice} group notice
   */
  notice?: TopicNotice;

  /**
   * @type {Boolean} is muted
   */
  muted?: boolean;

  cachedAt: number;

  isOwner: boolean;

  isAdmin: boolean;
}

export interface TopicMember {
  topicId?: string;
  userId?: string;
  remark?: string; // remark in the group
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Content {
  /**
   * @type {String} content type text, image, video, voice, file, location, link
   */
  type?: string;

  /**
   * @type {Boolean} is encrypted
   */
  encrypted?: boolean;

  /**
   * @type {Number} content checksum crc32, used for Text decryption verification
   */
  checksum?: number;

  /**
   * @type {String} text content, in markdown format
   */
  text: string;

  /**
   * @type {String} placeholder for display, e.g., [image], used in places where placeholders are needed for images, emojis, files, etc.
   */
  placeholder?: string;

  /**
   * @type {String} thumbnail url
   */
  thumbnail?: string;

  /**
   * @type {String} duration used in video, audio format: 00:00
   */
  duration?: string;

  /**
   * @type {Number} content size, used in files, images, videos, audio
   */
  size?: number;

  width?: number;
  height?: number;

  /**
   * @type {Array<String>} mentioned or specified people
   */
  mentions?: string[];

  /**
   * @type {String} reply message id
   */
  replyId?: string;

  /**
   * @type {String} reply message content
   */
  replyContent?: string;

  /**
   * @type {Map} extra data
   */
  extra?: Record<string, any>;

  /**
   * @type {Boolean} is unreadable
   */
  unreadable?: boolean;
}

export interface OnMessageResponse {
  /**
   * @type {Boolean} is read
   */
  hasRead?: boolean;

  /**
   * @type {int} response code
   */
  code?: number;
}

export interface ConversationUpdateFields {
  /**
   * @type {Boolean} sticky
   */
  sticky?: boolean;

  /**
   * @type {Boolean} mute
   */
  mute?: boolean;

  /**
   * @type {Array<String>} remark
   */
  tags?: string[];

  /**
   * @type {Map} extra
   */
  extra?: Record<string, any>;

  /**
   * @type {String} remark
   */
  remark?: string;
}

export interface UploadResult {
  /**
   * @type {Boolean} external is external file
   */
  external?: boolean;

  /**
   * @type {String} path, full url address
   */
  path?: string;

  /**
   * @type {String} fileName
   */
  fileName?: string;

  /**
   * @type {String} ext
   */
  ext?: string;

  /**
   * @type {int} size
   */
  size?: number;
}

export interface ChatRequest {
  /**
   * @type {String} message type
   */
  type?: string;

  /**
   * @type {Number} response status code
   */
  code?: number;

  /**
   * @type {String} topicId
   */
  topicId?: string;

  /**
   * @type {Number} seq
   */
  seq?: number;

  /**
   * @type {String} recipient, only filled in when the client sends a single chat message to a contact
   */
  attendee?: string;

  /**
   * @type {String} sender's user information
   */
  attendeeProfile?: any;

  /**
   * @type {String} message id
   */
  chatId: string;

  /**
   * @type {Content} message content
   */
  content?: Content;

  /**
   * @type {String} encrypted message text, only used by the sender
   */
  e2eContent?: string;

  /**
   * @type {String} prompt message, used to replace non-text, image, video, audio, file messages in Content, generally used in system messages
   */
  message?: string;

  receivedAt?: number;

  senderId?: string;

  isSentByMe?: boolean;

  status: number;

  createdAt: string | Date;

  updatedAt: string | Date;
}

export class ChatLog {
  /**
   * @type {Number} 序列号
   */
  seq: number = 0;

  /**
   * @type {String} 消息id，在当前会话中唯一
   */
  chatId: string = "";

  /**
   * @type {String} 发送者id
   */
  senderId: string = "";

  /**
   * @type {Content} 消息内容
   */
  content?: Content;

  /**
   * @type {String} 发送时间
   */
  createdAt: string | Date = "";

  /**
   * @type {String} 更新时间
   */
  updatedAt: string | Date = "";

  /**
   * @type {Number} 消息状态
   * Sending = 0, Sent = 1,
   * Received = 2,Read = 3,
   * Failed = 4
   */
  status?: number;

  /**
   * @type {Boolean} 是否未读
   */
  read?: boolean;

  /**
   * @type {Boolean} 是否撤回
   */
  recall?: boolean;

  isSentByMe?: boolean;

  attendee?: string;

  get readable() {
    if (!this.content) return false;
    return (
      this.content.unreadable !== true &&
      this.content.type !== "" && // type is empty, means it's deleted
      this.content.type !== "recall"
    ); // recall is not readable
  }
}

export interface Conversation {
  /**
   * @type {String} session id
   */
  topicId: string;

  /**
   * @type {String} session owner id (only for single chat)
   */
  attendee?: string;

  /**
   * @type {String} session owner id
   */
  ownerId?: string;

  /**
   * @type {Boolean} is group chat
   */
  multiple?: boolean;

  /**
   * @type {Topic} corresponding Topic details
   */
  topic?: Topic;

  /**
   * @type {String} session name
   */
  name?: string;

  /**
   * @type {String} session remark
   */
  remark?: string;

  /**
   * @type {String} session avatar
   */
  icon?: string;

  /**
   * @type {Boolean} is sticky
   */
  sticky?: boolean;

  /**
   *  @type {Number} unread messages count
   */
  unread: number;

  /**
   * @type {Content} last message
   */
  lastMessage?: Content;

  /**
   * @type {String} last message send time
   */
  lastMessageAt?: string | Date;

  lastMessageSeq?: number;
  lastSenderId?: string;
  lastReadSeq: number;
  lastReadAt?: string | Date;
  lastSeq: number;

  /**
   * @type {Number} the starting sequence number of the conversation
   */
  startSeq: number;

  updatedAt?: string | Date;
  createdAt?: string | Date;

  /**
   * @type {Boolean} is muted
   */
  mute?: boolean;

  members?: number;

  /**
   * @type {Array<String>} tags
   */
  tags?: string[] | null;

  /**
   * @type {Map} extra data
   */
  extra?: Record<string, any> | null;

  /**
   * @type {Map} topic's extra data
   */
  topicExtra?: Record<string, any> | null;

  /**
   * @type {String} topic owner id
   */
  topicOwnerID?: string | null;

  cachedAt: number;

  isOwner: boolean;

  typing?: boolean;
}
