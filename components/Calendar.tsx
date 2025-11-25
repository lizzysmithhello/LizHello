import React from 'react';
import { Payment } from '../types';
import { getDaysInMonth, getFirstDayOfMonth, isSameDay, toISODate } from '../utils/dateUtils';
import { CheckCircle, AlertCircle, Plus } from 'lucide-react';

interface CalendarProps {
  currentDate: Date;
  payments: Payment[];
  onSelectDate: (date: string) => void;
  missedDates: string[];
}

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export const Calendar: React.FC<CalendarProps> = ({ currentDate, payments, onSelectDate, missedDates }) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const days = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);
  
  // Create placeholders for empty slots before the first day
  const emptySlots = Array.from({ length: firstDayIndex });

  const getPaymentForDate = (d: Date) => {
    return payments.find(p => p.date === toISODate(d));
  };

  const isMissed = (d: Date) => {
    return missedDates.includes(toISODate(d));
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors duration-300">
      <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-700">
        {WEEKDAYS.map(day => (
          <div key={day} className="py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 auto-rows-fr bg-white dark:bg-slate-800">
        {emptySlots.map((_, i) => (
          <div key={`empty-${i}`} className="h-24 md:h-32 bg-slate-50/50 dark:bg-slate-800/50 border-b border-r border-slate-100 dark:border-slate-700 last:border-r-0" />
        ))}

        {days.map((date) => {
          const payment = getPaymentForDate(date);
          const missed = isMissed(date);
          const isToday = isSameDay(date, new Date());
          const dateStr = toISODate(date);

          return (
            <div 
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={`
                h-24 md:h-32 p-2 border-b border-r border-slate-100 dark:border-slate-700 relative cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-750
                ${isToday ? 'bg-red-50/40 dark:bg-red-900/10' : ''}
              `}
            >
              <div className="flex justify-between items-start">
                <span className={`
                  text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                  ${isToday ? 'bg-[#C1272D] text-white' : 'text-slate-700 dark:text-slate-300'}
                `}>
                  {date.getDate()}
                </span>
                
                {missed && (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
              </div>

              <div className="mt-2 flex flex-col gap-1">
                {payment ? (
                  <div className="flex flex-col items-start animate-fade-in">
                     <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/40 px-2 py-1 rounded-md w-full">
                        <CheckCircle size={12} />
                        ${payment.amount.toLocaleString()}
                     </span>
                     {payment.receiptImage && (
                       <span className="text-[10px] text-slate-400 mt-0.5 ml-1">Ticket adjunto</span>
                     )}
                  </div>
                ) : (
                  <div className="hidden group-hover:flex justify-center items-center h-full opacity-0 hover:opacity-100 transition-opacity">
                      <Plus className="text-slate-300 dark:text-slate-600" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};