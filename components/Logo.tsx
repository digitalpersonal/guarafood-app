import React from 'react';

export const Logo: React.FC<{ className?: string; size?: 'sm' | 'md' | 'lg' }> = ({ className = '', size = 'md' }) => {
  const heightClass = size === 'sm' ? 'h-7' : size === 'lg' ? 'h-12' : 'h-9';
  
  return (
    <div className={`flex items-center select-none ${className}`}>
      <img
        src="/assets/aistudio/file_0000000084dc820eade5873241a40876_2910595a.png"
        alt="GuaraFood"
        className={`${heightClass} w-auto object-contain flex-shrink-0`}
      />
    </div>
  );
};

export default Logo;
