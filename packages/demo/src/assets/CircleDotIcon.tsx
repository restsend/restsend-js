import React from "react";

const CircleDotIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    aria-hidden="true" 
    className="self-center" 
    width="3" 
    height="4" 
    viewBox="0 0 3 4" 
    fill="none"
    {...props}
  >
    <circle cx="1.5" cy="2" r="1.5" fill="#6B7280"/>
  </svg>
);

export default CircleDotIcon; 