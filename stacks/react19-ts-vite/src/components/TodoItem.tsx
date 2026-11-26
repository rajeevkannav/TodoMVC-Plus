import React, { useState, useRef, useEffect } from 'react';
import { Todo } from '../types';
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

  const handleCommit = () => {
    onEdit(editText);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(todo.text);
    setIsEditing(false);
  };

  return (
    <li 
      className={clsx(
        "group flex items-center gap-4 p-2 transition-colors",
        todo.completed ? "bg-muted/10" : "bg-card",
        isEditing && "ring-2 ring-primary ring-inset"
      )}
    >
      <button
        onClick={onToggle}
        className={clsx(
          "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all",
          todo.completed 
            ? "bg-primary border-primary text-primary-foreground" 
            : "border-border hover:border-primary"
        )}
        aria-label={todo.completed ? "Mark as active" : "Mark as completed"}
      >
        {todo.completed && <Check size={18} strokeWidth={3} />}
      </button>

      {isEditing ? (
        <input
          ref={inputRef}
          className="flex-1 py-2 px-1 bg-transparent outline-none text-lg"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleCommit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCommit();
            if (e.key === 'Escape') handleCancel();
          }}
        />
      ) : (
        <span
          onDoubleClick={() => setIsEditing(true)}
          className={clsx(
            "flex-1 py-2 text-lg transition-all cursor-text",
            todo.completed && "text-muted-foreground line-through"
          )}
        >
          {todo.text}
        </span>
      )}

      <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button
          onClick={onDelete}
          className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
          aria-label={`Delete ${todo.text}`}
        >
          <Trash2 size={20} />
        </button>
      </div>
    </li>
  );
}