import React from 'react';
import { Payment, EmployeeSettings } from '../types';
import { getDaysInMonth, toISODate } from '../utils/dateUtils';
import { AlertTriangle, TrendingUp, Calendar, CheckCheck } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface DashboardStatsProps {
  currentDate: Date;
  payments: Payment[];
  settings: EmployeeSettings;
  missedDates: string[];
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ currentDate, payments, settings, missedDates }) => {
  // Calculate Monthly Total
  const currentMonthStr = currentDate.toISOString().slice(0, 7); // YYYY-MM
  const monthlyPayments = payments.filter(p => p.date.startsWith(currentMonthStr));
  const totalPaid = monthlyPayments.reduce((sum, p) => sum + p.amount, 0);
  
  // Calculate Monthly Projection based on weekly settings and start date
  const allDaysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  
  let expectedPaymentCount = 0;
  allDaysInMonth.forEach(day => {
      // Check if day is payment day AND is after start date
      const isPaymentDay = day.getDay() === settings.weeklyPaymentDay;
      const isAfterStart = toISODate(day) >= settings.startDate;
      if (isPaymentDay && isAfterStart) {
          expectedPaymentCount++;
      }
  });

  const expectedTotal = settings.expectedAmount * expectedPaymentCount;
  
  // Avoid division by zero
  const progress = expectedTotal > 0 ? Math.min((totalPaid / expectedTotal) * 100, 100) : (totalPaid > 0 ? 100 : 0);

  // Total Pending Amount
  const totalPendingAmount = missedDates.length * settings.expectedAmount;

  // Prepare Chart Data (Group by Week)
  // Simplified: Last 4 months comparison
  const getMonthData = (offset: number) => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - offset, 1);
    const mStr = d.toISOString().slice(0, 7);
    const total = payments
        .filter(p => p.date.startsWith(mStr))
        .reduce((sum, p) => sum + p.amount, 0);
    return {
        name: new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(d),
        total
    };
  };

  const chartData = [
    getMonthData(3),
    getMonthData(2),
    getMonthData(1),
    getMonthData(0),
  ].reverse();

  return (
    <div className="space-y-6">
        
        {/* Alerts Section */}
        {missedDates.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm animate-pulse-slow">
                <div className="flex items-start">
                    <AlertTriangle className="text-red-500 mt-0.5 mr-3 flex-shrink-0" size={24} />
                    <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                             <h4 className="text-red-800 dark:text-red-300 font-bold text-lg">
                                Atención: Pagos Pendientes
                             </h4>
                             <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100 border border-red-200 dark:border-red-700">
                                Total Deuda: ${totalPendingAmount.toLocaleString()}
                             </span>
                        </div>
                        <p className="text-red-700 dark:text-red-400 text-sm mt-1">
                            Se detectaron {missedDates.length} semanas de pago omitidas desde el inicio.
                            <br />
                        </p>
                    </div>
                </div>
            </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between transition-colors">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Pagado (Mes)</p>
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-white">${totalPaid.toLocaleString()}</h3>
                    </div>
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                        <DollarSignIcon />
                    </div>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 mt-2">
                    <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
                <p className="text-xs text-slate-400 mt-2 text-right">
                    {progress.toFixed(0)}% del esperado (${expectedTotal.toLocaleString()})
                </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
                <div className="flex justify-between items-start mb-2">
                     <div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Último Pago</p>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                            {payments.length > 0 
                                ? new Date(payments[payments.length - 1].date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short'}) 
                                : 'Sin registros'}
                        </h3>
                     </div>
                     <div className="p-2 bg-red-100 dark:bg-red-900/30 text-[#C1272D] dark:text-red-400 rounded-lg">
                        <CheckCheck size={20} />
                     </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    {payments.length > 0 ? `Monto: $${payments[payments.length - 1].amount}` : '-'}
                </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
                <div className="flex justify-between items-start mb-2">
                     <div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Próximo Pago</p>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                           {/* Simple logic for next payment day */}
                           {getNextPaymentDate(settings.weeklyPaymentDay)}
                        </h3>
                     </div>
                     <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">
                        <Calendar size={20} />
                     </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Pago semanal configurado</p>
            </div>
        </div>

        {/* Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
            <h4 className="text-slate-800 dark:text-white font-semibold mb-6 flex items-center gap-2">
                <TrendingUp size={18} className="text-slate-400" />
                Historial de Pagos
            </h4>
            <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:opacity-10" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                        <Tooltip 
                            cursor={{fill: 'transparent'}}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="total" fill="#C1272D" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    </div>
  );
};

const DollarSignIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
);

function getNextPaymentDate(dayOfWeek: number): string {
    const today = new Date();
    const resultDate = new Date(today.getTime());
    resultDate.setDate(today.getDate() + (7 + dayOfWeek - today.getDay()) % 7);
    if (today.getDay() === dayOfWeek) {
        // If today is payment day, assume next week if we wanted strict "next", 
        // but user might want "today" if it hasn't happened. 
        // Let's just return weekday name for simplicity or today's date
        return 'Hoy';
    }
    return new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(resultDate);
}