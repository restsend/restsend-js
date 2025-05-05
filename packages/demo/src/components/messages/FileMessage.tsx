import React from "react";
import { Content } from "@resetsend/sdk";
import PDFIcon from "../../assets/PDFIcon";
import CircleDotIcon from "../../assets/CircleDotIcon";
import DownloadIcon from "../../assets/DownloadIcon";

interface FileMessageProps {
  content: Content;
}

const FileMessage: React.FC<FileMessageProps> = ({ content }) => {
  const filename = content.placeholder || (content.text && content.text.split('/').pop()) || '文件';
  // 计算文件大小的显示方式
  const formatFileSize = (size: number | undefined) => {
    if (!size) return "未知大小";
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  // 获取文件类型
  const getFileType = () => {
    if (!filename) return 'File';
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext ? ext.toUpperCase() : 'File';
  };
  
  return (
    <div className="leading-1.5 flex w-full max-w-[320px] flex-col">
      <div className="flex items-start bg-gray-50 dark:bg-gray-700 rounded-xl p-2">
        <div className="me-2">
          <span className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white pb-2">
            <PDFIcon />
            {filename}
          </span>
          <span className="flex text-xs font-normal text-gray-500 dark:text-gray-400 gap-2">
            {(content as any).pages && `${(content as any).pages} Pages`}
            {(content as any).pages && <CircleDotIcon />}
            {formatFileSize(content.size)} 
            <CircleDotIcon />
            {getFileType()}
          </span>
        </div>
        <div className="inline-flex self-center items-center">
          <a 
            href={content.text || '#'} 
            download={filename}
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex self-center items-center p-2 text-sm font-medium text-center text-gray-900 bg-gray-50 rounded-lg hover:bg-gray-100 focus:ring-4 focus:outline-none dark:text-white focus:ring-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600 dark:focus:ring-gray-600"
          >
            <DownloadIcon />
          </a>
        </div>
      </div>
    </div>
  );
};

export default FileMessage; 