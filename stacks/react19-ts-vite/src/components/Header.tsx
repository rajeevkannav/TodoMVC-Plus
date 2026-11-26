import React, { useState } from 'react';
import { ChevronDown, RotateCcw, RotateCw, Download, Upload, Sun, Moon } from 'lucide-react';
import { cn, safeJsonParse } from '../lib/utils';
import { z } from 'zod';
import { Todo } from '../hooks/useTodos';

const TodoSchema = z.array(z.object({
  id: z.string(),
  text: z.string(),
  completed: z.boolean(),
  createdAt: z.number()
}));

interface HeaderProps {
  onAdd: (text: string) => void;
  onToggleAll: () => void;
  allCompleted: boolean;
  hasTodos: boolean;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  todos: Todo[];
  setTodos: (todos: Todo[]) => void;
}

export function Header({ onAdd, onToggleAll, allCompleted, hasTodos, undo, redo, canUndo, canRedo, todos, setTodos }: HeaderProps) {
  const [text, setText] = useState('');
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(text);
    setText('');
  };

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(todos, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `todos-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = safeJsonParse(content, TodoSchema);
      if (parsed) setTodos(parsed);
      else alert('Invalid JSON format');
    };
    reader.readAsText(file);
  };

  return (
    <header className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-black tracking-tighter text-brand-primary">TODOS<span className="text-brand-accent">+</span></h1>
        
        <div className="flex items-center gap-1 sm:gap-2">
          <button 
            onClick={undo} 
            disabled={!canUndo} 
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 focus-ring"
            aria-label="Undo"
          >
            <RotateCcw size={20} />
          </button>
          <button 
            onClick={redo} 
            disabled={!canRedo} 
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 focus-ring"
            aria-label="Redo"
          >
            <RotateCw size={20} />
          </button>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1" />
          <button 
            onClick={exportData} 
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 focus-ring"
            aria-label="Export JSON"
          >
            <Download size={20} />
          </button>
          <label className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer focus-ring">
            <Upload size={20} />
            <input type="file" className="sr-only" accept=".json" onChange={importData} />
            <span className="sr-only">Import JSON</span>
          </label>
          <button 
            onClick={toggleTheme} 
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 focus-ring"
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="relative flex items-center">
        {hasTodos && (
          <button
            type="button"
            onClick={onToggleAll}
            className={cn(
              "absolute left-3 p-1 rounded-md transition-colors focus-ring",
              allCompleted ? "text-brand-primary" : "text-slate-600 dark:text-slate-300"
            )}
            aria-label="Toggle all todos"
          >
            <ChevronDown size={24} />
          </button>
        )}
        <input
          type="text"
          className={cn(
            "w-full py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-brand-primary rounded-xl text-lg transition-all focus-ring",
            hasTodos ? "pl-12 pr-4" : "px-4"
          )}
          placeholder="What needs to be done?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
      </form>
    </header>
  );
}
