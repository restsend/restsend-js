import React from "react";
import { Content } from "@resetsend/sdk";

interface LogsMessageProps {
  content: Content;
}

const LogsMessage: React.FC<LogsMessageProps> = ({ content }) => {
  return (
    <div className="border border-gray-400 rounded-md bg-gray-100 p-3">
      <a href={content.text} target="_blank" rel="noopener noreferrer">
        <p>{content.placeholder || ''}</p>
        <p className="mt-1">size:<span className="mx-1">({content.size || 0})</span>Bytes</p>
      </a>
    </div>
  );
};

export default LogsMessage; 