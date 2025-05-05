import React from "react";
import { useAppStore } from "../app.store";
import CloseIcon from "../assets/CloseIcon";

interface UserPanelProps {
  showUserPanel: boolean;
  setShowUserPanel: (show: boolean) => void;
}

const UserPanel: React.FC<UserPanelProps> = ({ showUserPanel, setShowUserPanel }) => {
  const { client, startApp } = useAppStore();

  const myId = (client && client.getMyId()) || "";

  if (!showUserPanel) return null;

  return (
    <div className="flex flex-col h-full w-full shrink-0 truncate bg-white border-r border-gray-300">
      <div className="p-4 border-b border-gray-300 flex justify-between items-center">
        <h2 className="text-lg font-semibold">账号</h2>
        <button
          onClick={() => setShowUserPanel(false)}
          className="text-gray-500 hover:text-gray-700">
          <CloseIcon />
        </button>
      </div>

      <ul className="flex-1 overflow-y-auto">
        <li
          className={`p-4 border-b border-gray-300 cursor-pointer hover:bg-gray-200 ${myId === "alice" ? "bg-gray-300" : ""}`}
          onClick={() => {
            startApp("alice");
            setShowUserPanel(false);
          }}>
          Alice
        </li>
        <li
          className={`p-4 border-b border-gray-300 cursor-pointer hover:bg-gray-200 ${myId === "bob" ? "bg-gray-300" : ""}`}
          onClick={() => {
            startApp("bob");
            setShowUserPanel(false);
          }}>
          Bob
        </li>
        <li
          className={`p-4 border-b border-gray-300 cursor-pointer hover:bg-gray-200 ${myId === "guest-demo" ? "bg-gray-300" : ""}`}
          onClick={() => {
            startApp();
            setShowUserPanel(false);
          }}>
          Guest
        </li>
        <li
          className={`p-4 border-b border-gray-300 cursor-pointer hover:bg-gray-200 ${/guest-random/i.test(myId) ? "bg-gray-300" : ""}`}
          onClick={() => {
            startApp(undefined, true);
            setShowUserPanel(false);
          }}>
          Guest(Random)
        </li>
      </ul>
    </div>
  );
};

export default UserPanel;
