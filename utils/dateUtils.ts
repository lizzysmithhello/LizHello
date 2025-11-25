export const formatDate = (dateString: string): string => {
  const date = new Date(dateString + 'T00:00:00'); // Force local time to avoid timezone shifts
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
};

export const getMonthName = (date: Date): string => {
  return new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(date);
};

export const getDaysInMonth = (year: number, month: number): Date[] => {
  const date = new Date(year, month, 1);
  const days: Date[] = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

export const getFirstDayOfMonth = (year: number, month: number): number => {
  // 0 = Sunday, 1 = Monday... but we want Calendar to start on Monday usually in generic ES locales
  // However, standard JS getDay() is 0=Sun. Let's stick to 0=Sun for the grid logic to match standard headers.
  return new Date(year, month, 1).getDay();
};

export const isSameDay = (d1: Date, d2: Date): boolean => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

export const toISODate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const getWeekNumber = (date: Date): number => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

export const isSameWeek = (date1: Date, date2: Date): boolean => {
  // Adjust to start of week (Monday) to compare
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  // Make Monday (1) the first day. 0 is Sunday.
  const day1 = d1.getDay() || 7;
  const day2 = d2.getDay() || 7;
  
  d1.setHours(0, 0, 0, 0);
  if (day1 !== 1) d1.setHours(-24 * (day1 - 1));
  
  d2.setHours(0, 0, 0, 0);
  if (day2 !== 1) d2.setHours(-24 * (day2 - 1));
  
  return d1.getTime() === d2.getTime();
};