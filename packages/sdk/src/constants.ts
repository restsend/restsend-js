export const NetworkState = {
  Connected: "connected",
  Connecting: "connecting",
  Disconnected: "disconnected",
};

export const ChatContentType = {
  Null: "",
  Text: "text",
  Image: "image",
  Video: "video",
  Voice: "voice",
  File: "file",
  Location: "location",
  Sticker: "sticker",
  Contact: "contact",
  Invite: "invite",
  Link: "link",
  Logs: "logs",
  TopicCreate: "topic.create",
  TopicDismiss: "topic.dismiss",
  TopicQuit: "topic.quit",
  TopicKickout: "topic.kickout",
  TopicJoin: "topic.join",
  TopicNotice: "topic.notice",
  TopicKnock: "topic.knock",
  TopicKnockAccept: "topic.knock.accept",
  TopicKnockReject: "topic.knock.reject",
  TopicSilent: "topic.silent",
  TopicSilentMember: "topic.silent.member",
  TopicChangeOwner: "topic.changeowner",
  UploadFile: "file.upload",
  ConversationUpdate: "conversation.update",
  ConversationRemoved: "conversation.removed",
  UpdateExtra: "update.extra",
};

export const ChatRequestType = {
  Nop: "nop",
  Chat: "chat",
  Typing: "typing",
  Read: "read",
  Response: "resp",
  Kickout: "kickout",
  System: "system",
};

export const LogStatusSending = 0;
export const LogStatusSent = 1;
export const LogStatusReceived = 2;
export const LogStatusRead = 3;
export const LogStatusFailed = 4;
