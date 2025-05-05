import React from "react";
import { ChatLog } from "@resetsend/sdk";
import TextMessage from "./TextMessage";
import ImageMessage from "./ImageMessage";
import FileMessage from "./FileMessage";
import LogsMessage from "./LogsMessage";
import RecalledMessage from "./RecalledMessage";
import DefaultMessage from "./DefaultMessage";
import ReplyMessageWrapper from "./ReplyMessageWrapper";
import VoiceMessage from "./VoiceMessage";

interface MessageContentProps {
  log: ChatLog;
}

const MessageContent: React.FC<MessageContentProps> = ({ log }) => {
  if (!log.content) {
    return null;
  }

  const content = log.content;
  let messageComponent: React.ReactNode = null;

  switch (content.type) {
    case 'text':
      messageComponent = <TextMessage content={content} />;
      break;
    case 'image':
      messageComponent = <ImageMessage content={content} />;
      break;
    case 'file':
      messageComponent = <FileMessage content={content} />;
      break;
    case 'voice':
    case 'audio':
      messageComponent = <VoiceMessage content={content} />;
      break;
    case 'logs':
      messageComponent = <LogsMessage content={content} />;
      break;
    case 'recall':
      return null;
    case 'recalled':
      return <RecalledMessage />;
    default:
      messageComponent = <DefaultMessage content={content} />;
  }

  if (content.replyContent) {
    return (
      <ReplyMessageWrapper content={content}>
        {messageComponent}
      </ReplyMessageWrapper>
    );
  }

  return messageComponent;
};

export default MessageContent; 