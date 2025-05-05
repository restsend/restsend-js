import React from "react";
import { Content } from "@resetsend/sdk";

interface TextMessageProps {
  content: Content;
}

const TextMessage: React.FC<TextMessageProps> = ({ content }) => {
  let text = content.text;
  if (content.text && content.text.length > 512) {
    text = content.text.substring(0, 512);
    text += ` ... (more ${content.text.length - 512} bytes)`;
  }

  return (
    <p className="text-sm font-normal py-2">
      {text}
    </p>
  );
};

export default TextMessage; 