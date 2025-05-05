import React from "react";
import { Content, ChatLog } from "@resetsend/sdk";

interface ReplyMessageWrapperProps {
  content: Content;
  children: React.ReactNode;
}

// 简化版的回复内容渲染组件，避免循环依赖
const RenderReplyContent = ({ replyContent }: { replyContent: Content }) => {
  if (!replyContent.type) return null;
  
  
  // 简单判断内容类型并显示预览
  switch (replyContent.type) {
    case 'text':
      return <span>{replyContent.text?.substring(0, 50)}{replyContent.text && replyContent.text.length > 50 ? '...' : ''}</span>;
    case 'image':
      return <span>[图片]</span>;
    case 'file':
      return <span>[文件] {replyContent.placeholder || replyContent.text?.split('/').pop() || '文件'}</span>;
    case 'voice':
    case 'audio':
      return <span>[语音] {replyContent.duration ? `${replyContent.duration}秒` : ''}</span>;
    case 'recalled':
      return <span>[已撤回]</span>;
    default:
      return <span>[消息]</span>;
  }
};

const ReplyMessageWrapper: React.FC<ReplyMessageWrapperProps> = ({ content, children }) => {
  let replyContent: React.ReactNode = null;
  
  if (content.replyContent) {
    try {
      const replyData = JSON.parse(content.replyContent) as Content;
      replyContent = (
        <div className="bg-gray-50 text-gray-600 text-sm px-2 py-1 rounded-sm mb-1 border-l-2 border-gray-300">
          <RenderReplyContent replyContent={replyData} />
        </div>
      );
    } catch (e) {
      replyContent = (
        <div className="bg-gray-50 text-gray-600 text-sm px-2 py-1 rounded-sm mb-1 border-l-2 border-gray-300">
          [回复内容解析错误]
        </div>
      );
    }
  } else {
    replyContent = (
      <div className="bg-gray-50 text-gray-600 text-sm px-2 py-1 rounded-sm mb-1 border-l-2 border-gray-300">
        [已撤回]
      </div>
    );
  }

  return (
    <div>
      {replyContent}
      {children}
    </div>
  );
};

export default ReplyMessageWrapper; 