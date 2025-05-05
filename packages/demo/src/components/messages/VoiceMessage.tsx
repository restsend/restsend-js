import React, { useState } from 'react';

interface VoiceMessageProps {
  content: {
    url?: string;
    duration?: string | number;
    [key: string]: any;
  };
}

const VoiceMessage: React.FC<VoiceMessageProps> = ({ content }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  
  // 处理duration可能是字符串或数字的情况
  const duration = typeof content.duration === 'string' 
    ? parseFloat(content.duration) || 0 
    : content.duration || 0;

  // 将秒转换为分:秒格式
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' + secs : secs}`;
  };

  // 这里仅作UI展示，实际应用中需要接入真实的音频播放功能
  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    // 模拟播放结束
    if (!isPlaying) {
      setTimeout(() => {
        setIsPlaying(false);
      }, duration * 1000);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-[320px] leading-1.5 py-2 rounded-e-xl rounded-es-xl">
      <div className="flex items-center space-x-2">
        <button 
          onClick={togglePlay} 
          className="inline-flex self-center items-center p-2 text-sm font-medium text-center text-gray-900 rounded-lg hover:bg-gray-100 focus:ring-4 focus:outline-none dark:text-white focus:ring-gray-50 dark:hover:bg-gray-600 dark:focus:ring-gray-600"
          type="button"
        >
          {isPlaying ? (
            <svg className="w-4 h-4 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 12 16">
              <path d="M3 0H2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2Zm7 0H9a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2Z"/>
            </svg>
          ) : (
            <svg className="w-4 h-4 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 14 16">
              <path d="M0 .984v14.032a1 1 0 0 0 1.506.845l12.006-7.016a.974.974 0 0 0 0-1.69L1.506.139A1 1 0 0 0 0 .984Z"/>
            </svg>
          )}
        </button>
        
        <svg className="w-[145px] md:w-[185px] md:h-[40px]" aria-hidden="true" viewBox="0 0 185 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect y="17" width="3" height="6" rx="1.5" fill="#6B7280" className="dark:fill-white"/>
          <rect x="7" y="15.5" width="3" height="9" rx="1.5" fill="#6B7280" className="dark:fill-white"/>
          <rect x="21" y="6.5" width="3" height="27" rx="1.5" fill="#6B7280" className="dark:fill-white"/>
          <rect x="14" y="6.5" width="3" height="27" rx="1.5" fill="#6B7280" className="dark:fill-white"/>
          <rect x="28" y="3" width="3" height="34" rx="1.5" fill="#6B7280" className="dark:fill-white"/>
          <rect x="35" y="3" width="3" height="34" rx="1.5" fill="#6B7280" className="dark:fill-white"/>
          <rect x="42" y="5.5" width="3" height="29" rx="1.5" fill="#6B7280" className="dark:fill-white"/>
          <rect x="49" y="10" width="3" height="20" rx="1.5" fill="#6B7280" className="dark:fill-white"/>
          <rect x="56" y="13.5" width="3" height="13" rx="1.5" fill="#6B7280" className="dark:fill-white"/>
          <rect x="63" y="16" width="3" height="8" rx="1.5" fill="#6B7280" className="dark:fill-white"/>
          <rect x="70" y="12.5" width="3" height="15" rx="1.5" fill="#E5E7EB" className="dark:fill-gray-500"/>
          <rect x="77" y="3" width="3" height="34" rx="1.5" fill="#E5E7EB" className="dark:fill-gray-500"/>
          <rect x="84" y="3" width="3" height="34" rx="1.5" fill="#E5E7EB" className="dark:fill-gray-500"/>
          <rect x="91" y="0.5" width="3" height="39" rx="1.5" fill="#E5E7EB" className="dark:fill-gray-500"/>
          <rect x="98" y="0.5" width="3" height="39" rx="1.5" fill="#E5E7EB" className="dark:fill-gray-500"/>
          <rect x="105" y="2" width="3" height="36" rx="1.5" fill="#E5E7EB" className="dark:fill-gray-500"/>
          <rect x="112" y="6.5" width="3" height="27" rx="1.5" fill="#E5E7EB" className="dark:fill-gray-500"/>
          <rect x="119" y="9" width="3" height="22" rx="1.5" fill="#E5E7EB" className="dark:fill-gray-500"/>
          <rect x="126" y="11.5" width="3" height="17" rx="1.5" fill="#E5E7EB" className="dark:fill-gray-500"/>
          <rect x="133" y="2" width="3" height="36" rx="1.5" fill="#E5E7EB" className="dark:fill-gray-500"/>
          <rect x="140" y="2" width="3" height="36" rx="1.5" fill="#E5E7EB" className="dark:fill-gray-500"/>
          <rect x="147" y="7" width="3" height="26" rx="1.5" fill="#E5E7EB" className="dark:fill-gray-500"/>
          <rect x="154" y="9" width="3" height="22" rx="1.5" fill="#E5E7EB" className="dark:fill-gray-500"/>
          <rect x="161" y="9" width="3" height="22" rx="1.5" fill="#E5E7EB" className="dark:fill-gray-500"/>
          <rect x="168" y="13.5" width="3" height="13" rx="1.5" fill="#E5E7EB" className="dark:fill-gray-500"/>
          <rect x="175" y="16" width="3" height="8" rx="1.5" fill="#E5E7EB" className="dark:fill-gray-500"/>
          <rect x="182" y="17.5" width="3" height="5" rx="1.5" fill="#E5E7EB" className="dark:fill-gray-500"/>
          <rect x="66" y="16" width="8" height="8" rx="4" fill="#1C64F2"/>
        </svg>
        
        <span className="inline-flex self-center items-center p-2 text-sm font-medium text-gray-900 dark:text-white">
          {formatDuration(duration)}
        </span>
      </div>
    </div>
  );
};

export default VoiceMessage; 