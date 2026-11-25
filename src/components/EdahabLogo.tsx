import React from 'react';

interface EdahabLogoProps {
  size?: number;
  variant?: 'header' | 'dark' | 'gold';
  className?: string;
}

export const EdahabLogo: React.FC<EdahabLogoProps> = ({
  size = 44,
  variant = 'header',
  className = '',
}) => {
  const outerFill =
    variant === 'header' ? '#1A1A1A' : variant === 'gold' ? '#DFC798' : '#1E1E1E';
  const ringStroke = variant === 'header' ? '#9C824A' : '#DFC798';
  const letterFill = variant === 'gold' ? '#1A1A1A' : '#DFC798';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="شعار eDahab"
      className={className}
    >
      {/* Teardrop-shield emblem */}
      <path
        d="M32 4C46 4 56 15 56 30C56 44.5 44 55.5 32 60C20 55.5 8 44.5 8 30C8 15 18 4 32 4Z"
        fill={outerFill}
        stroke={ringStroke}
        strokeWidth="2.5"
      />
      <path
        d="M32 8.5C43.2 8.5 51.5 17.6 51.5 29.8C51.5 41.5 41.8 50.8 32 55C22.2 50.8 12.5 41.5 12.5 29.8C12.5 17.6 20.8 8.5 32 8.5Z"
        stroke={ringStroke}
        strokeOpacity="0.45"
        strokeWidth="1.2"
      />
      {/* Stylized golden 'e' */}
      <path
        d="M41.5 31.5H24.6C25.2 35.8 28.4 38.4 32.8 38.4C35.8 38.4 38.2 37.3 40.1 35.4L42.8 38.3C40.1 41.2 36.7 42.6 32.3 42.6C24.5 42.6 19.6 37.4 19.6 30.2C19.6 23.1 24.5 17.8 31.8 17.8C39.2 17.8 43.2 22.9 43.2 29.4C43.2 30.1 43.1 30.8 41.5 31.5ZM24.7 27.6H38.2C37.8 23.8 35.4 21.8 31.7 21.8C27.9 21.8 25.3 24 24.7 27.6Z"
        fill={letterFill}
      />
    </svg>
  );
};
