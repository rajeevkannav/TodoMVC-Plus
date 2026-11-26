import React, { useState, useRef, useEffect } from 'react';
import { Todo } from '../types';
import { Check, Trash2, Edit3, X, CheckCircle2, Circle } from 'lucide-react';
import { clsx } from 'clsx';

interface Props {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, text: string) => void;
}

export function TodoItem({ todo, onToggle, onDelete, onEdit }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const handleSubmit = () => {
    onEdit(todo.id, editText);
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
      className={clsx(
        "group flex items-center gap-3 p-4 border-b border-[var(--border)] transition-colors",
        todo.completed && "bg-black/5 dark:bg-white/5"
      )}
    >
      <button
        onClick={() => onToggle(todo.id)}
        className="flex-shrink-0 text-[var(--primary)] hover:scale-110 transition-transform"
        aria-label={todo.completed ? `Mark "${todo.text}" as active` : `Mark "${todo.text}" as completed`}
      >
        {todo.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
      </button>

      {isEditing ? (
        <input
          ref={inputRef}
          className="flex-grow bg-transparent border-b-2 border-[var(--primary)] outline-none py-1"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={handleKeyDown}
          aria-label="Edit todo text"
        />
      ) : (
        <span 
          className={clsx(
            "flex-grow text-lg break-words min-w-0",
            todo.completed && "line-through opacity-50"
          )}
          onDoubleClick={() => setIsEditing(true)}
        >
          {todo.text}
        </span>
      )}

      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-full"
          aria-label={`Edit "${todo.text}"`}
        >
          {isEditing ? <X size={20} /> : <Edit3 size={20} />}
        </button>
        <button
          onClick={() => onDelete(todo.id)}
          className="p-2 hover:bg-red-500/20 text-red-500 rounded-full"
          aria-label={`Delete "${todo.text}"`}
        >
          <Trash2 size={20} />
        </button>
      </div>
    </li>
  );
}