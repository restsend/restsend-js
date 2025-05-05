import { ChatLog } from "@resetsend/sdk";
import React from "react";
import { useAppStore } from "../app.store";
import MessageContent from "./messages/MessageContent";
import MessageDropdownMenu from "./MessageDropdownMenu";

interface MessageItemProps {
  item: ChatLog;
}

const MessageItem: React.FC<MessageItemProps> = ({
  item
}) => {
  const { doDeleteMessage, doRecallMessage, doQuoteMessage } = useAppStore();

  // 获取发送者显示的首字母
  const getAvatarText = (senderId: string | undefined) => {
    if (!senderId) return 'U';
    return senderId.charAt(0).toUpperCase();
  };

  // 格式化时间显示
  const formatTime = (timestamp: string | number | Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  // 根据senderId获取头像URL
  const getAvatarSrc = (senderId: string | undefined) => {
    // 这里可以根据senderId返回不同的头像
    if (!senderId) return '';
    if (senderId.toLowerCase() === 'alice') {
      return 'https://flowbite.com/docs/images/people/profile-picture-3.jpg';
    } else if (senderId.toLowerCase() === 'bob') {
      return 'https://flowbite.com/docs/images/people/profile-picture-2.jpg';
    }
    return 'https://flowbite.com/docs/images/people/profile-picture-5.jpg';
  };

  return (
    <div className="mb-4">
      {!item.isSentByMe && (
        <div className="flex items-start gap-2.5">
          {/* 使用图片头像或字母头像 */}
          {getAvatarSrc(item.senderId) ? (
            <img 
              className="w-8 h-8 rounded-full" 
              src={getAvatarSrc(item.senderId)} 
              alt={`${item.senderId} avatar`} 
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-medium">
                {getAvatarText(item.senderId)}
              </span>
            </div>
          )}
          
          <div className="flex flex-col w-full max-w-[320px] leading-1.5">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold text-gray-900">
                {item.senderId || "用户"}
              </span>
              <span className="text-sm font-normal text-gray-500">
                {formatTime(item.createdAt)}
              </span>
            </div>
            <div className="p-3 border-gray-200 bg-gray-100 rounded-e-xl rounded-es-xl relative group">
              <MessageContent log={item} />
              
              <MessageDropdownMenu 
                item={item} 
                position="right"
                onReply={doQuoteMessage}
                onDelete={doDeleteMessage}
              />
            </div>
            <span className="text-sm font-normal text-gray-500 mt-1">已读</span>
          </div>
        </div>
      )}

      {item.isSentByMe && (
        <div className="flex items-start gap-2.5 justify-end">
          <div className="flex flex-col items-end w-full max-w-[320px] leading-1.5">
            <div className="flex items-center space-x-2 justify-end">
              <span className="text-sm font-normal text-gray-500">
                {formatTime(item.createdAt)}
              </span>
              <span className="text-sm font-semibold text-gray-900">
                我
              </span>
            </div>
            <div className="p-3 bg-gray-100 text-gray-900 rounded-s-xl rounded-ee-xl relative group">
              <MessageContent log={item} />
              
              <MessageDropdownMenu 
                item={item} 
                position="left"
                onReply={doQuoteMessage}
                onRecall={doRecallMessage}
                onDelete={doDeleteMessage}
              />
            </div>
            <span className="text-sm font-normal text-gray-500 mt-1">已送达</span>
          </div>
          
          {/* 自己的头像 */}
          {getAvatarSrc('me') ? (
            <img 
              className="w-8 h-8 rounded-full" 
              src="https://flowbite.com/docs/images/people/profile-picture-4.jpg" 
              alt="My avatar" 
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-medium">ME</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageItem; 