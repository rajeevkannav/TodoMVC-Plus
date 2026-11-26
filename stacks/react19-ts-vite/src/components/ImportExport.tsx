import { Todo, TodoSchema } from '../types';
import { Download, Upload } from 'lucide-react';
import { z } from 'zod';
import { safeJsonParse } from '../lib/utils';

interface Props {
  todos: Todo[];
  onImport: (todos: Todo[]) => void;
}

export function ImportExport({ todos, onImport }: Props) {
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(todos, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `todos-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = safeJsonParse(content);
      const result = z.array(TodoSchema).safeParse(parsed);
      
      if (result.success) {
        onImport(result.data);
      } else {
        alert('Invalid JSON format');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex items-center gap-2">
      <button 
        onClick={handleExport}
        className="p-2 rounded-full hover:bg-border transition-colors"
        aria-label="Export todos as JSON"
      >
        <Download size={20} />
      </button>
      <label className="p-2 rounded-full hover:bg-border transition-colors cursor-pointer">
        <Upload size={20} />
        <input 
          type="file" 
          accept=".json" 
          className="sr-only" 
          onChange={handleImport} 
        />
        <span className="sr-only">Import todos from JSON</span>
      </label>
    </div>
  );
}