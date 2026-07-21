import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark' | 'auto';
}

export function Logo({ className = '', size = 'md', variant = 'auto' }: LogoProps) {
  const dimensions = {
    sm: { width: 100, height: 30 },
    md: { width: 150, height: 45 },
    lg: { width: 220, height: 66 },
  };

  const { width, height } = dimensions[size];

  const logoSrc = 
    variant === 'light' 
      ? '/odizo_logo_full-removebg-preview.png' 
      : variant === 'dark' 
      ? '/odizo_logo_full_dark.png' 
      : null;

  return (
    <div className={`flex items-center justify-center select-none ${className}`}>
      {logoSrc ? (
        <img
          src={logoSrc}
          alt="ODIZO Logo"
          style={{
            width,
            height,
            objectFit: 'contain',
          }}
          className="drop-shadow-[0_0_10px_rgba(225,97,103,0.15)] transition-transform duration-300 hover:scale-105"
        />
      ) : (
        <>
          {/* Light Mode Logo */}
          <img
            src="/odizo_logo_full-removebg-preview.png"
            alt="ODIZO Logo"
            style={{
              width,
              height,
              objectFit: 'contain',
            }}
            className="dark:hidden drop-shadow-[0_0_10px_rgba(225,97,103,0.15)] transition-transform duration-300 hover:scale-105"
          />
          {/* Dark Mode Logo */}
          <img
            src="/odizo_logo_full_dark.png"
            alt="ODIZO Logo"
            style={{
              width,
              height,
              objectFit: 'contain',
            }}
            className="hidden dark:block drop-shadow-[0_0_10px_rgba(225,97,103,0.15)] transition-transform duration-300 hover:scale-105"
          />
        </>
      )}
    </div>
  );
}

export default Logo;
