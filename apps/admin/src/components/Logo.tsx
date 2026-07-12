import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className = '', size = 'md' }: LogoProps) {
  const dimensions = {
    sm: { width: 90, height: 30, fontSize: 20 },
    md: { width: 130, height: 40, fontSize: 26 },
    lg: { width: 180, height: 50, fontSize: 34 },
  };

  const { width, height, fontSize } = dimensions[size];

  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Render "Odizo" text with red dot */}
        <text
          x="5"
          y={height - (height * 0.3)}
          fill="#FFFFFF"
          fontWeight="bold"
          fontSize={fontSize}
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          letterSpacing="0.05em"
        >
          ODIZO
        </text>
        {/* Odizo red dot accent */}
        <circle
          cx={width - (width * 0.18)}
          cy={height - (height * 0.45)}
          r={fontSize * 0.16}
          fill="#E16167"
        />
      </svg>
    </div>
  );
}
export default Logo;
