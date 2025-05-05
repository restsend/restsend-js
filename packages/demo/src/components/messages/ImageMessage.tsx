import React from "react";
import { Content } from "@resetsend/sdk";
import DownloadImageIcon from "../../assets/DownloadImageIcon";

interface ImageMessageProps {
  content: Content;
}

const ImageMessage: React.FC<ImageMessageProps> = ({ content }) => {
  return (
    <div className="leading-1.5 flex w-full max-w-[320px] flex-col">
      {content.text && (
        <>
          <p className="text-sm font-normal text-gray-900 dark:text-white">
            {content.placeholder || "图片"}
          </p>
          <div className="group relative mt-2">
            <div className="absolute w-full h-full bg-gray-900/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg flex items-center justify-center">
              <a
                href={content.text}
                download
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full h-10 w-10 bg-white/30 hover:bg-white/50 focus:ring-4 focus:outline-none dark:text-white focus:ring-gray-50"
                data-tooltip-target="download-image"
              >
                <DownloadImageIcon />
              </a>
              <div id="download-image" role="tooltip" className="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-gray-900 rounded-lg shadow-xs opacity-0 tooltip dark:bg-gray-700">
                下载图片
                <div className="tooltip-arrow" data-popper-arrow></div>
              </div>
            </div>
            <img src={content.text} className="rounded-lg object-cover max-h-[300px]" alt={content.placeholder || "图片"} />
          </div>
        </>
      )}
    </div>
  );
};

export default ImageMessage; 