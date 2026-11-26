import React, { useState, useRef, useEffect } from 'react';
import { Todo } from '../types';
import { Trash2, Edit3, Check, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  todo: Todo;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: (text: string) => void;
}

export function TodoItem({ todo, onToggle, onDelete, onEdit }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) editInputRef.current?.focus();
  }, [isEditing]);

  const handleCommit = () => {
    const trimmed = editText.trim();
    if (trimmed) {
      onEdit(trimmed);
      setIsEditing(false);
    } else {
      onDelete();
    }
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
        todo.completed && "bg-muted/30",
        isEditing && "ring-2 ring-primary ring-inset"
      )}
    >
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={onToggle}
        className="w-6 h-6 rounded-full border-2 border-primary cursor-pointer"
        aria-label={`Mark "${todo.text}" as ${todo.completed ? 'incomplete' : 'complete'}`}
      />

      {isEditing ? (
        <input
          ref={editInputRef}
          className="flex-1 bg-transparent text-xl focus:outline-none"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleCommit}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <span 
          className={cn(
            "flex-1 text-xl transition-all break-words min-w-0",
            todo.completed && "text-muted-foreground line-through"
          )}
          onDoubleClick={() => setIsEditing(true)}
        >
          {todo.text}
        </span>
      )}

      <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
        {isEditing ? (
          <button onClick={handleCommit} className="p-2 text-green-600" aria-label="Save edit">
            <Check size={20} />
          </button>
        ) : (
          <button onClick={() => setIsEditing(true)} className="p-2 text-primary" aria-label="Edit task">
            <Edit3 size={20} />
          </button>
        )}
        <button onClick={onDelete} className="p-2 text-red-500" aria-label="Delete task">
          <Trash2 size={20} />
        </button>
      </div>
    </li>
  );
}