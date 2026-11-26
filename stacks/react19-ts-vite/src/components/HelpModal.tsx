import React from 'react';
import { X } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 relative">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Keyboard Shortcuts
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close help modal"
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300 mb-6">
          <li className="flex justify-between">
            <span>Add Todo</span>
            <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded font-mono text-xs">Enter (in input)</kbd>
          </li>
          <li className="flex justify-between">
            <span>Save Edit</span>
            <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded font-mono text-xs">Enter / Blur</kbd>
          </li>
          <li className="flex justify-between">
            <span>Cancel Edit</span>
            <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded font-mono text-xs">Escape</kbd>
          </li>
          <li className="flex justify-between">
            <span>Undo</span>
            <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded font-mono text-xs">Ctrl+Z</kbd>
          </li>
          <li className="flex justify-between">
            <span>Redo</span>
            <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded font-mono text-xs">Ctrl+Shift+Z</kbd>
          </li>
        </ul>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
