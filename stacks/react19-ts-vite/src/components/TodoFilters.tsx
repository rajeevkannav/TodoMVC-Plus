import { FilterType } from '../types';
import { cn } from '../lib/utils';

interface Props {
  current: FilterType;
  onFilter: (filter: FilterType) => void;
}

export function TodoFilters({ current, onFilter }: Props) {
  const filters: FilterType[] = ['all', 'active', 'completed'];

  return (
    <nav className="flex gap-1" aria-label="Filter todos">
      {filters.map(f => (
        <button
          key={f}
          onClick={() => onFilter(f)}
          className={cn(
            "px-3 py-1 rounded-md capitalize transition-colors",
            current === f ? "bg-primary text-primary-foreground" : "hover:bg-border"
          )}
          aria-current={current === f ? 'page' : undefined}
        >
          {f}
        </button>
      ))}
    </nav>
  );
}