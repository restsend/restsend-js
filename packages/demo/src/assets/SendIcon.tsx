import React from "react";

const SendIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    className="w-5 h-5 rotate-90" 
    aria-hidden="true" 
    xmlns="http://www.w3.org/2000/svg" 
    fill="currentColor" 
    viewBox="0 0 18 20"
    {...props}
  >
    <path d="m17.914 18.594-8-18a1 1 0 0 0-1.828 0l-8 18a1 1 0 0 0 1.157 1.376L8 18.281V9a1 1 0 0 1 2 0v9.281l6.758 1.689a1 1 0 0 0 1.156-1.376Z"/>
  </svg>
);

export default SendIcon; 