import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Check, X } from 'lucide-react';
import { Todo } from '../hooks/useTodos';
import { cn } from '../lib/utils';

interface TodoItemProps {
  todo: Todo;
  onToggle: () => void;
  onEdit: (text: string) => void;
  onDelete: () => void;
}

export function TodoItem({ todo, onToggle, onEdit, onDelete }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const handleCommit = () => {
    onEdit(editText);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCommit();
    if (e.key === 'Escape') {
      setEditText(todo.text);
      setIsEditing(false);
    }
  };

  return (
    <li 
      className={cn(
        "group flex items-center gap-4 p-4 transition-all",
        todo.completed && "bg-slate-50/50 dark:bg-slate-900/50"
      )}
      onDoubleClick={() => setIsEditing(true)}
    >
      <div className="relative flex items-center justify-center">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={onToggle}
          className="peer appearance-none w-7 h-7 border-2 border-slate-300 dark:border-slate-700 rounded-full checked:bg-brand-primary checked:border-brand-primary transition-all cursor-pointer focus-ring"
          aria-label={`Mark ${todo.text} as ${todo.completed ? 'active' : 'completed'}`}
        />
        <Check 
          className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity"
          size={18} 
          strokeWidth={3}
        />
      </div>

      {isEditing ? (
        <input
          ref={inputRef}
          className="flex-1 py-1 px-2 bg-white dark:bg-slate-800 border-2 border-brand-primary rounded-md focus-ring"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleCommit}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <span 
          className={cn(
            "flex-1 text-lg transition-all break-words min-w-0",
            todo.completed ? "text-slate-600 dark:text-slate-300 line-through decoration-2" : "text-slate-800 dark:text-slate-200"
          )}
        >
          {todo.text}
        </span>
      )}

      <div className="flex items-center gap-1">
        <button
          onClick={onDelete}
          className="p-2 text-slate-600 dark:text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all focus-ring"
          aria-label={`Delete ${todo.text}`}
        >
          <Trash2 size={20} />
        </button>
      </div>
    </li>
  );
}
