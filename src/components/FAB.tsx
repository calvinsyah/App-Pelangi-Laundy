import React from 'react';

interface FABProps {
  icon: React.ReactNode;
  label?: string;
  onClick: () => void;
  color?: 'blue' | 'green' | 'emerald' | 'red';
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  className?: string;
}

export default function FAB({ 
  icon, 
  label, 
  onClick, 
  color = 'blue', 
  position = 'bottom-right',
  className = ''
}: FABProps) {
  const colorClasses = {
    blue: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30',
    green: 'bg-green-600 hover:bg-green-700 text-white shadow-green-500/30',
    emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/30',
    red: 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/30',
  };

  const positionClasses = {
    'bottom-right': 'fixed bottom-6 right-6',
    'bottom-left': 'fixed bottom-6 left-6',
    'bottom-center': 'fixed bottom-6 left-1/2 -translate-x-1/2',
  };

  return (
    <button
      onClick={onClick}
      className={`
        ${positionClasses[position]} 
        ${colorClasses[color]} 
        flex items-center justify-center gap-2 
        h-14 ${label ? 'px-6 rounded-full' : 'w-14 rounded-full'} 
        shadow-lg hover:shadow-xl hover:-translate-y-1 
        transition-all duration-200 z-50
        ${className}
      `}
      title={label}
    >
      {icon}
      {label && <span className="font-bold">{label}</span>}
    </button>
  );
}
