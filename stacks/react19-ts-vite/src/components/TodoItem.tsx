import React, { useState, useRef, useEffect } from 'react';
import { Todo } from '../types';
import { Trash2, Edit2, Check, X } from 'lucide-react';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, newText: string) => void;
}

export const TodoItem: React.FC<TodoItemProps> = ({ todo, onToggle, onDelete, onEdit }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = editText.trim();
    if (trimmed === '') {
      onDelete(todo.id);
    } else {
      onEdit(todo.id, trimmed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditText(todo.text);
      setIsEditing(false);
    }
  };

  return (
    <li className={`group relative flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors ${todo.completed ? 'opacity-75' : ''}`}>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => onToggle(todo.id)}
          aria-label={`Mark "${todo.text}" as ${todo.completed ? 'active' : 'completed'}`}
          className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer min-w-[24px] min-h-[24px]"
        />
        
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="flex-1 px-2 py-1 text-base bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded border border-indigo-500 focus:outline-none min-h-[36px]"
          />
        ) : (
          <span
            onDoubleClick={() => setIsEditing(true)}
            className={`text-base truncate flex-1 cursor-text select-none ${todo.completed ? 'line-through text-slate-600 dark:text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}
          >
            {todo.text}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 ml-2">
        {!isEditing && (
          <>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              aria-label={`Edit "${todo.text}"`}
              className="p-1.5 rounded text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(todo.id)}
              aria-label={`Delete "${todo.text}"`}
              className="p-1.5 rounded text-slate-600 dark:text-slate-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </li>
  );
};
