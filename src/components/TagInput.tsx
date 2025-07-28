"use client";

import { useState } from 'react';
import { X, Plus } from 'lucide-react';

interface TagInputProps {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function TagInput({ 
  values, 
  onChange, 
  placeholder = "Agregar elemento...", 
  className = "",
  disabled = false 
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addTag = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && !values.includes(trimmedValue)) {
      onChange([...values, trimmedValue]);
      setInputValue('');
    }
  };

  const removeTag = (indexToRemove: number) => {
    onChange(values.filter((_, index) => index !== indexToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className={`border border-gray-300 rounded-md p-2 ${className}`}>
      {/* Tags Display */}
      <div className="flex flex-wrap gap-2 mb-2">
        {values.map((tag, index) => (
          <span
            key={index}
            className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm flex items-center gap-1"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="text-blue-600 hover:text-blue-800"
              >
                <X size={12} />
              </button>
            )}
          </span>
        ))}
      </div>

      {/* Input */}
      {!disabled && (
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="flex-1 border-0 outline-none text-sm"
          />
          <button
            type="button"
            onClick={addTag}
            disabled={!inputValue.trim()}
            className="text-blue-600 hover:text-blue-800 disabled:text-gray-400"
          >
            <Plus size={16} />
          </button>
        </div>
      )}
    </div>
  );
}