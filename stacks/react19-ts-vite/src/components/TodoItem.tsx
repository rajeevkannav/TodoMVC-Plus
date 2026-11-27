import React, { useState, useRef, useEffect } from 'react';
import { Todo } from '../lib/storage';
import { Trash2, Check, X } from 'lucide-react';
import { clsx } from 'clsx';

interface Props {
  todo: Todo;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: (text: string) => void;
}

export function TodoItem({ todo, onToggle, onDelete, onEdit }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const handleSubmit = () => {
    onEdit(editText);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') {
      setEditText(todo.text);
      setIsEditing(false);
    }
  };

  return (
    <li className="group flex items-center gap-4 px-4 py-1 min-h-[64px] hover:bg-bg/50 transition-colors">
      <div className="relative flex items-center justify-center">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={onToggle}
          className="peer appearance-none w-8 h-8 border-2 border-border rounded-full checked:bg-primary checked:border-primary cursor-pointer transition-all"
          aria-label={`Mark ${todo.text} as ${todo.completed ? 'active' : 'completed'}`}
        />
        <Check 
          className="absolute pointer-events-none text-white opacity-0 peer-checked:opacity-100 transition-opacity"
          size={18} 
        />
      </div>

      {isEditing ? (
        <div className="flex-1 flex items-center gap-2">
          <input
            ref={inputRef}
            className="flex-1 py-2 px-2 bg-surface border border-primary rounded-md"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSubmit}
          />
          <button onClick={handleSubmit} aria-label="Save edit" className="p-2 text-green-600">
            <Check size={20} />
          </button>
          <button onClick={() => setIsEditing(false)} aria-label="Cancel edit" className="p-2 text-red-600">
            <X size={20} />
          </button>
        </div>
      ) : (
        <>
          <span 
            className={clsx(
              "flex-1 text-xl transition-all break-words min-w-0",
              todo.completed && "text-text-muted line-through"
            )}
            onDoubleClick={() => setIsEditing(true)}
          >
            {todo.text}
          </span>
          <button
            onClick={onDelete}
            className="p-2 text-text-muted hover:text-red-500 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label={`Delete ${todo.text}`}
          >
            <Trash2 size={20} />
          </button>
        </>
      )}
    </li>
  );
}