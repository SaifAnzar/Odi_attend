import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className = '', size = 'md' }: LogoProps) {
  const dimensions = {
    sm: { width: 100, height: 30 },
    md: { width: 150, height: 45 },
    lg: { width: 220, height: 66 },
  };

  const { width, height } = dimensions[size];

  return (
    <div className={`flex items-center justify-center select-none ${className}`}>
      <img
        src="/odizo_logo_full.png"
        alt="ODIZO Logo"
        style={{
          width,
          height,
          objectFit: 'contain',
        }}
        className="drop-shadow-[0_0_10px_rgba(225,97,103,0.15)] transition-transform duration-300 hover:scale-105"
      />
    </div>
  );
}

export default Logo;
