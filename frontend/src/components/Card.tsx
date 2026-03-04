import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}

const Card: React.FC<CardProps> = ({ children, className = '', hoverable = false }) => {
  return (
    <div
      className={`
        bg-gray-800 rounded-xl p-6 border border-gray-700
        ${hoverable ? 'hover:border-gray-600 hover:shadow-lg transition-all' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default Card;