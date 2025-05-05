import React from "react";
import { useAppStore } from "../app.store";
import CircleCloseIcon from "../assets/CircleCloseIcon";
import AttachmentIcon from "../assets/AttachmentIcon";
import SendIcon from "../assets/SendIcon";

const MessageInput = () => {
  const {
    current,
    textMessage,
    quoteMessage,
    setTextMessage,
    doTyping,
    sendMessage,
    doQuoteMessage,
    doSendFiles: storeSendFiles,
  } = useAppStore();

  const renderQuote = () => {
    if (!quoteMessage) return "";
    return `引用: ${quoteMessage.content?.text || ""}`;
  };

  const doSendFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!current || !event.target.files || event.target.files.length === 0) return;

    const topicId = current.topicId;
    let file = event.target.files[0];
    await storeSendFiles(file, topicId);
  };

  return (
    <div className="border-t border-gray-200 p-4 bg-white">
      {quoteMessage && (
        <div className="flex justify-between items-center p-2 bg-gray-100 border-l-4 border-blue-500 rounded mb-3">
          <p
            dangerouslySetInnerHTML={{ __html: renderQuote() }}
            className="text-gray-600 text-sm"
          />
          <button className="text-gray-500 hover:text-gray-700" onClick={() => doQuoteMessage(undefined)}>
            <CircleCloseIcon />
          </button>
        </div>
      )}

      <div className="flex items-center space-x-2">
        <div className="relative rounded-full transition duration-300 ease-in-out text-gray-500 focus:outline-none">
          <input
            type="file"
            id="fileInput"
            className="hidden"
            onChange={doSendFiles}
          />

          <label htmlFor="fileInput" className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 cursor-pointer">
            <AttachmentIcon />
          </label>
        </div>

        <input
          type="text"
          className="flex-1 py-2 px-4 border border-gray-300 rounded-full text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          placeholder="输入消息..."
          onKeyDown={doTyping}
          value={textMessage}
          onChange={(e) => setTextMessage(e.target.value)}
          onKeyUp={(e) => e.key === "Enter" && sendMessage()}
        />
        
        <button
          className="inline-flex justify-center p-2 text-blue-600 rounded-full cursor-pointer hover:bg-blue-100"
          onClick={sendMessage}>
          <SendIcon />
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
