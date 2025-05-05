import React, { useEffect, useRef } from "react";
import { useAppStore } from "../app.store";
import MessageItem from "./MessageItem";

const ChatBox = () => {
  const { messages } = useAppStore();

  const chatboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 当消息更新时，滚动到底部
    if (chatboxRef.current) {
      chatboxRef.current.scrollTop = chatboxRef.current.scrollHeight;
    }
  }, [messages]);

  const onScrollMessages = (event: React.UIEvent<HTMLDivElement>) => {};

  return (
    <div 
      className="flex-1 p-4 overflow-y-auto bg-gray-50 relative" 
      ref={chatboxRef} 
      onScroll={onScrollMessages}
      style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.025' fill-rule='evenodd'%3E%3Cpath d='M5 0h1L0 5v1H0V0h5z'/%3E%3C/g%3E%3C/svg%3E')" }}
    >
      <div className="flex flex-col space-y-3 pb-3">
        {messages.map(
          (item) => item.readable && <MessageItem key={item.chatId + "_" + item.seq} item={item} />
        )}
      </div>
    </div>
  );
};

export default ChatBox;
