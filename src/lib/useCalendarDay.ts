import { useEffect, useState } from 'react';
export function localToday() { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
export function useCalendarDay() {
  const [day, setDay] = useState(localToday);
  useEffect(() => { const sync = () => setDay(localToday()); const timer = setInterval(sync, 60000); document.addEventListener('visibilitychange', sync); return () => { clearInterval(timer); document.removeEventListener('visibilitychange', sync); }; }, []);
  return new Date(`${day}T12:00:00`);
}
