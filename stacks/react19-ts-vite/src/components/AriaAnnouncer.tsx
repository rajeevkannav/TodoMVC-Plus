import { useEffect, useState } from 'react';

export function AriaAnnouncer({ message }: { message: string }) {
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (message) {
      setAnnouncement(message);
      const timer = setTimeout(() => setAnnouncement(''), 1000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div 
      role="status" 
      aria-live="polite" 
      aria-atomic="true" 
      className="sr-only"
    >
      {announcement}
    </div>
  );
}