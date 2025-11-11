
import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center ${className}`}>
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className="text-white"
      fill="currentColor"
    >
      <path d="M21 13H3c-1.103 0-2 .897-2 2v2c0 1.103.897 2 2 2h18c1.103 0 2-.897 2-2v-2c0-1.103-.897-2-2-2zM1 9V7c0-1.103.897-2 2-2h2v4H3c-1.103 0-2 .897-2 2v2h4V9H1zM19 5h2c1.103 0 2 .897 2 2v2h-4V5zM11 5h2v4h-2V5zm-4 0h2v4H7V5z"/>
      <path d="M11 11.5a.5.5 0 0 1 .5-.5h.999a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5z"/>
      <path d="M14 11.5a.5.5 0 0 1 .5-.5h.999a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5z"/>
      <path d="M17 11.5a.5.5 0 0 1 .5-.5h.999a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5z"/>
      <path d="M11 14.5a.5.5 0 0 1 .5-.5h.999a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5z"/>
      <path d="M14 14.5a.5.5 0 0 1 .5-.5h.999a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5z"/>
      <path d="M17 14.5a.5.5 0 0 1 .5-.5h.999a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5z"/>
      <path d="M12 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
      <path d="M12 2c-4.963 0-9 4.037-9 9 0 4.148 3.037 7.6 7 8.722V21h4v-1.278c3.963-1.122 7-4.574 7-8.722 0-4.963-4.037-9-9-9zm0 16a7 7 0 1 1 0-14 7 7 0 0 1 0 14z"/>
    </svg>
    <span className="text-3xl text-white font-bold ml-2">GuaraFood</span>
  </div>
);
