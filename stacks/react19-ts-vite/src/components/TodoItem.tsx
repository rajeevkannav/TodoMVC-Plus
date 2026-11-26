import React, { useState, useRef, useEffect } from 'react';
import { Todo } from '../lib/db';
import { Trash2, Check } from 'lucide-react';
import * as Checkbox from '@radix-ui/react-checkbox';

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
    <li 
      className={`group flex items-center gap-4 px-4 py-2 transition-colors ${isEditing ? 'bg-slate-50 dark:bg-slate-900' : 'hover:bg-slate-50/50 dark:hover:bg-slate-900/50'}`}
      style={{ containerType: 'inline-size' }}
    >
      {!isEditing && (
        <Checkbox.Root
          checked={todo.completed}
          onCheckedChange={onToggle}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[var(--border)] data-[state=checked]:bg-[var(--primary)] data-[state=checked]:border-[var(--primary)] focus-ring transition-colors"
          id={`todo-${todo.id}`}
        >
          <Checkbox.Indicator>
            <Check className="h-4 w-4 text-white" strokeWidth={3} />
          </Checkbox.Indicator>
        </Checkbox.Root>
      )}

      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            ref={inputRef}
            className="w-full py-2 text-lg bg-transparent border-none focus:outline-none"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleSubmit}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <label
            htmlFor={`todo-${todo.id}`}
            onDoubleClick={() => setIsEditing(true)}
            className={`block py-2 text-lg truncate transition-all ${
              todo.completed ? 'text-slate-400 line-through' : 'text-[var(--foreground)]'
            }`}
          >
            {todo.text}
          </label>
        )}
      </div>

      {!isEditing && (
        <button
          onClick={onDelete}
          className="p-2 text-slate-400 hover:text-red-500 opacity-100 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 focus-ring transition-all"
          aria-label={`Delete ${todo.text}`}
        >
          <Trash2 size={18} />
        </button>
      )}
    </li>
  );
}