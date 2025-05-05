import { useState } from "react";
import "./App.css";
import UserPanel from "./components/UserPanel";
import ConversationList from "./components/ConversationList";
import ChatBox from "./components/ChatBox";
import MessageInput from "./components/MessageInput";
import LogPanel from "./components/LogPanel";
import UserIcon from "./assets/UserIcon";
import LogIcon from "./assets/LogIcon";

function App() {
  const [showUserPanel, setShowUserPanel] = useState(false);
  const [showLogPanel, setShowLogPanel] = useState(false);

  return (
    <div className="bg-gray-100 h-screen flex overflow-hidden relative">
      {/* 左侧会话列表 - 固定宽度 */}
      <div className="w-64 h-full border-r border-gray-300 flex-shrink-0">
        <ConversationList />
      </div>

      {/* 中间聊天区域 - 自适应宽度 */}
      <div className="flex flex-col flex-grow h-full">
        <ChatBox />
        <MessageInput />
      </div>

      {/* 悬浮按钮 - 统一放在左下角 */}
      <div className="absolute bottom-4 left-4 flex space-x-2 z-20">
        {/* 用户面板切换按钮 */}
        <button
          onClick={() => setShowUserPanel(!showUserPanel)}
          className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full shadow-lg"
          title="切换用户面板">
          <UserIcon />
        </button>
        {/* 日志面板切换按钮 */}
        <button
          onClick={() => setShowLogPanel(!showLogPanel)}
          className="bg-indigo-500 hover:bg-indigo-600 text-white p-2 rounded-full shadow-lg"
          title="切换日志面板">
          <LogIcon />
        </button>
      </div>

      {/* 用户面板 - 悬浮 */}
      {showUserPanel && (
        <div
          className={`absolute top-0 left-0 h-full w-64 bg-white shadow-xl z-10 transition-transform duration-300 ease-in-out ${showUserPanel ? "translate-x-0" : "-translate-x-full"}`}>
          <UserPanel showUserPanel={showUserPanel} setShowUserPanel={setShowUserPanel} />
        </div>
      )}

      {/* 日志面板 - 悬浮 */}
      {showLogPanel && (
        <div
          className={`absolute top-0 right-0 h-full w-80 xl:w-[30rem] bg-indigo-100 shadow-xl z-10 transition-transform duration-300 ease-in-out ${showLogPanel ? "translate-x-0" : "translate-x-full"}`}>
          <LogPanel showLogPanel={showLogPanel} setShowLogPanel={setShowLogPanel} />
        </div>
      )}
    </div>
  );
}

export default App;
