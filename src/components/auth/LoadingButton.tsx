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
      w-full min-h-11 py-3 px-4 rounded-lg font-medium
      bg-primary text-primary-foreground
      hover:bg-primary/90 active:bg-primary/80
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
      transition-colors duration-200 ease-out
      disabled:opacity-50 disabled:cursor-not-allowed
      ${className || ''}
    `}
  >
    {loading ? (
      <div className="flex items-center justify-center space-x-2">
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        <span>Cargando...</span>
      </div>
    ) : (
      children
    )}
  </button>
);
