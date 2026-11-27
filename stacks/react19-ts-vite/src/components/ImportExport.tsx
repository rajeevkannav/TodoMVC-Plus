import { Download, Upload } from 'lucide-react';
import { Todo, validateImport } from '../lib/storage';
import { useRef } from 'react';

interface Props {
  todos: Todo[];
  onImport: (todos: Todo[]) => void;
}

export function ImportExport({ todos, onImport }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      try {
        const json = JSON.parse(event.target?.result as string);
        const validated = validateImport(json);
        onImport(validated);
      } catch (err) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex gap-1">
      <button 
        onClick={handleExport} 
        className="p-2 rounded-md hover:bg-surface" 
        aria-label="Export todos as JSON"
      >
        <Download size={20} />
      </button>
      <button 
        onClick={() => fileInputRef.current?.click()} 
        className="p-2 rounded-md hover:bg-surface" 
        aria-label="Import todos from JSON"
      >
        <Upload size={20} />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
      />
    </div>
  );
}