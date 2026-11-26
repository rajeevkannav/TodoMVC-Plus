import { Filter } from '../types';
import { clsx } from 'clsx';

interface Props {
  current: Filter;
  onChange: (f: Filter) => void;
}

export function FilterBar({ current, onChange }: Props) {
  const filters: Filter[] = ['all', 'active', 'completed'];

  return (
    <nav className="flex gap-1 p-1 bg-muted rounded-lg" aria-label="Filter todos">
      {filters.map(f => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={clsx(
            "px-3 py-1 rounded-md capitalize transition-all",
            current === f 
              ? "bg-card text-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-current={current === f ? 'page' : undefined}
        >
          {f}
        </button>
      ))}
    </nav>
  );
}