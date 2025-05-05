import React from "react";
import { useAppStore } from "../app.store";
import CloseIcon from "../assets/CloseIcon";

interface LogPanelProps {
  showLogPanel: boolean;
  setShowLogPanel: (show: boolean) => void;
}

const LogPanel: React.FC<LogPanelProps> = ({ showLogPanel, setShowLogPanel }) => {
  const { logs, clearLogs } = useAppStore();

  if (!showLogPanel) return null;

  return (
    <div className="flex flex-col h-full w-full shrink-0 bg-indigo-100">
      <div className="p-4 border-b border-gray-300 bg-white flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-950">日志</h2>
        <button 
          onClick={() => setShowLogPanel(false)}
          className="text-gray-500 hover:text-gray-700 mr-2"
        >
          <CloseIcon />
        </button>
        <button
          onClick={clearLogs}
          className="py-1 bg-gray-950 hover:bg-gray-800 text-white rounded-md px-3">
          清除
        </button>
      </div>
      <div className="flex-1 p-4 overflow-y-auto text-gray-600">
        {logs.map((item, idx) => (
          <p key={idx} className="text-sm py-1">
            <span>{item.time}</span> : <span>{item.text}</span>
          </p>
        ))}
      </div>
    </div>
  );
};

export default LogPanel; 