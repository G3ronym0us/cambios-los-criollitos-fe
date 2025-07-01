"use client";

import React from 'react';
import { LoadingButtonProps } from '@/types/auth';

export const LoadingButton: React.FC<LoadingButtonProps> = ({ 
  loading, 
  children, 
  className,
  ...props 
}) => (
  <button
    {...props}
    disabled={loading || props.disabled}
    className={`
      w-full py-3 px-4 rounded-lg font-medium text-white
      bg-gradient-to-r from-blue-600 to-purple-600
      hover:from-blue-700 hover:to-purple-700
      focus:ring-4 focus:ring-blue-200
      transform transition-all duration-200 ease-in-out
      disabled:opacity-50 disabled:cursor-not-allowed
      ${loading ? 'scale-95' : 'hover:scale-105 active:scale-95'}
      ${className || ''}
    `}
  >
    {loading ? (
      <div className="flex items-center justify-center space-x-2">
        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        <span>Cargando...</span>
      </div>
    ) : (
      children
    )}
  </button>
);