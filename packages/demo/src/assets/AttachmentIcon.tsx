import React from "react";

const AttachmentIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    className="w-5 h-5 text-gray-600" 
    aria-hidden="true" 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 20 18"
    {...props}
  >
    <path 
      stroke="currentColor" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth="1.5" 
      d="M13 8v8m-6-8v8m-6-8v8m20-8v8M3 8c0-.93 0-1.395.102-1.776a3 3 0 0 1 2.122-2.122C5.605 4 6.07 4 7 4h6c.93 0 1.395 0 1.776.102a3 3 0 0 1 2.122 2.122C17 6.605 17 7.07 17 8M10 1v3" 
    />
  </svg>
);

export default AttachmentIcon; 