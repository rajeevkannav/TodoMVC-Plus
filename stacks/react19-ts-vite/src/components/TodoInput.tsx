import React, { useState } from 'react';
import { Plus } from 'lucide-react';

interface TodoInputProps {
  onAdd: (text: string) => void;
}

export const TodoInput: React.FC<TodoInputProps> = ({ onAdd }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (trimmed) {
      onAdd(trimmed);
      setText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex items-center shadow-lg rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
      <label htmlFor="new-todo-input" className="sr-only">
        What needs to be done?
      </label>
      <input
        id="new-todo-input"
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What needs to be done?"
        className="w-full py-4 pl-4 pr-14 text-lg bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[48px]"
      />
      <button
        type="submit"
        aria-label="Add todo"
        className="absolute right-2 p-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center justify-center min-w-[36px] min-h-[36px] focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <Plus className="w-5 h-5" />
      </button>
    </form>
  );
};
