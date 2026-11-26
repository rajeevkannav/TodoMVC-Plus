import React from 'react';

export function Announcer({ message }: { message: string }) {
  return (
    <div 
      role="status" 
      aria-live="polite" 
      className="sr-only"
    >
      {message}
    </div>
  );
}