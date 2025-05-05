import React from "react";

const DotsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    className="w-4 h-4 text-gray-500" 
    aria-hidden="true" 
    xmlns="http://www.w3.org/2000/svg" 
    fill="currentColor" 
    viewBox="0 0 16 3"
    {...props}
  >
    <path d="M2 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm6.5 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM14 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z"/>
  </svg>
);

export default DotsIcon; 