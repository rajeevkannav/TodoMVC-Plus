import React, { useRef } from 'react';
import { Sun, Moon, RotateCcw, RotateCw, Download, Upload, HelpCircle } from 'lucide-react';

interface HeaderProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenHelp: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  darkMode,
  onToggleDarkMode,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onExport,
  onImport,
  onOpenHelp,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="flex items-center justify-between py-6 border-b border-slate-200 dark:border-slate-800 mb-6">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
          TodoMVC+
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo"
          className={`p-2 rounded-lg border border-slate-200 dark:border-slate-800 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center ${
            canUndo
              ? 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
              : 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="Redo"
          className={`p-2 rounded-lg border border-slate-200 dark:border-slate-800 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center ${
            canRedo
              ? 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
              : 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300'
          }`}
        >
          <RotateCw className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onExport}
          aria-label="Export JSON"
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
        >
          <Download className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Import JSON"
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
        >
          <Upload className="w-4 h-4" />
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={onImport}
            className="hidden"
            aria-label="Import JSON file"
          />
        </button>

        <button
          type="button"
          onClick={onToggleDarkMode}
          aria-label="Toggle dark mode"
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={onOpenHelp}
          aria-label="Keyboard shortcuts help"
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
