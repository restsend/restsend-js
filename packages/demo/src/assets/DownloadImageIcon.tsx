import React from "react";

const DownloadImageIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    className="w-5 h-5 text-white" 
    aria-hidden="true" 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 16 18"
    {...props}
  >
    <path 
      stroke="currentColor" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth="2" 
      d="M8 1v11m0 0 4-4m-4 4L4 8m11 4v3a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-3"
    />
  </svg>
);

export default DownloadImageIcon; 