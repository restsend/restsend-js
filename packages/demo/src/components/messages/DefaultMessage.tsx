import React from "react";
import { Content } from "@resetsend/sdk";

interface DefaultMessageProps {
  content: Content;
}

const DefaultMessage: React.FC<DefaultMessageProps> = ({ content }) => {
  return (
    <div>
      <span>[{content.type}]</span>
      {content.placeholder || content.text || ''}
    </div>
  );
};

export default DefaultMessage; 