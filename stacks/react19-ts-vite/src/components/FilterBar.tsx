import { clsx } from 'clsx';

interface Props {
  activeCount: number;
  filter: 'all' | 'active' | 'completed';
  setFilter: (f: 'all' | 'active' | 'completed') => void;
  onClearCompleted: () => void;
  hasCompleted: boolean;
}

export function FilterBar({ activeCount, filter, setFilter, onClearCompleted, hasCompleted }: Props) {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 text-sm text-text-muted border-t border-border">
      <span className="w-24">{activeCount} {activeCount === 1 ? 'item' : 'items'} left</span>
      
      <nav className="flex gap-1">
        {(['all', 'active', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              "px-3 py-1 rounded-md capitalize transition-colors",
              filter === f ? "bg-primary text-white" : "hover:bg-surface"
            )}
            aria-current={filter === f ? 'page' : undefined}
          >
            {f}
          </button>
        ))}
      </nav>

      <div className="w-24 flex justify-end">
        {hasCompleted && (
          <button 
            onClick={onClearCompleted} 
            className="hover:underline"
          >
            Clear completed
          </button>
        )}
      </div>
    </footer>
  );
}