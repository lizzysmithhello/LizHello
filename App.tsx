import React, { useState, useEffect, useMemo } from 'react';
import { Calendar } from './components/Calendar';
import { PaymentModal } from './components/PaymentModal';
import { DashboardStats } from './components/DashboardStats';
import { SettingsModal } from './components/SettingsModal';
import { Payment, EmployeeSettings } from './types';
import { getMonthName, toISODate } from './utils/dateUtils';
import { generateMonthlyReport } from './utils/pdfGenerator';
import { ChevronLeft, ChevronRight, Settings, User, FileDown } from 'lucide-react';

const App: React.FC = () => {
  // --- State ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(toISODate(new Date()));
  const [editingPayment, setEditingPayment] = useState<Payment | undefined>(undefined);
  
  // Settings with startDate
  const [settings, setSettings] = useState<EmployeeSettings>(() => {
    // Try to load settings from local storage or default
    const savedSettings = localStorage.getItem('pagotrack_settings');
    if (savedSettings) {
        return JSON.parse(savedSettings);
    }
    // Default to start of current year
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    return {
        name: "Juan Pérez",
        weeklyPaymentDay: 5, // Friday
        expectedAmount: 2500,
        startDate: toISODate(startOfYear)
    };
  });

  // --- Effects ---
  useEffect(() => {
    // Load from local storage on mount
    const saved = localStorage.getItem('pagotrack_payments');
    if (saved) {
      try {
        setPayments(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing saved payments", e);
      }
    } else {
        // Seed some dummy data for demonstration
        const today = new Date();
        const dummy: Payment[] = [
            { id: '1', date: toISODate(new Date(today.getFullYear(), today.getMonth(), 5)), amount: 2500, note: 'Pago semana 1' },
            { id: '2', date: toISODate(new Date(today.getFullYear(), today.getMonth(), 12)), amount: 2500, note: 'Pago semana 2' },
        ];
        setPayments(dummy);
    }
  }, []);

  useEffect(() => {
    // Save to local storage on change
    localStorage.setItem('pagotrack_payments', JSON.stringify(payments));
  }, [payments]);

  useEffect(() => {
    localStorage.setItem('pagotrack_settings', JSON.stringify(settings));
  }, [settings]);

  // --- Logic ---
  
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    const existing = payments.find(p => p.date === dateStr);
    setEditingPayment(existing);
    setIsModalOpen(true);
  };

  const handleSavePayment = (data: Omit<Payment, 'id'>) => {
    setPayments(prev => {
      // Remove existing for this date if we are editing or overwriting
      const filtered = prev.filter(p => p.date !== data.date);
      const newPayment: Payment = {
        ...data,
        id: crypto.randomUUID()
      };
      // Keep array sorted by date
      const newArr = [...filtered, newPayment].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      return newArr;
    });
  };

  const handleSaveSettings = (newSettings: EmployeeSettings) => {
      setSettings(newSettings);
  };

  const handleDownloadPDF = () => {
      generateMonthlyReport(currentDate, payments, settings);
  };

  // Calculate missed payments
  const missedDates = useMemo(() => {
    const missed: string[] = [];
    const today = new Date();
    // Start checking from beginning of current month view
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0); // End of month
    
    // Iterate days
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        // Stop if future
        if (d > today) break;

        const dateStr = toISODate(d);

        // Skip if before start date
        if (dateStr < settings.startDate) continue;

        // Check if it's a payment day (e.g., Friday = 5)
        if (d.getDay() === settings.weeklyPaymentDay) {
            
            // Check if payment exists on that exact date.
            const hasPayment = payments.some(p => p.date === dateStr);
            if (!hasPayment) {
                missed.push(dateStr);
            }
        }
    }
    return missed;
  }, [currentDate, payments, settings.weeklyPaymentDay, settings.startDate]);


  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Logo Recreation: CENTRO MEAVE 6 */}
            <div className="flex items-baseline leading-none select-none tracking-tighter">
                <span className="text-2xl md:text-3xl font-bold text-[#C1272D]">CENTRO</span>
                <span className="text-2xl md:text-3xl font-light text-black mx-1">MEAVE</span>
                <span className="text-4xl md:text-5xl font-bold text-[#C1272D]">6</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 md:gap-6">
             <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">Pagos a</span>
                <div className="flex items-center gap-2 text-slate-700">
                    <User size={18} className="text-[#C1272D]" />
                    <span className="font-bold text-lg leading-tight">{settings.name}</span>
                </div>
             </div>
             <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
             <button 
                onClick={() => setIsSettingsOpen(true)}
                className="text-slate-400 hover:text-[#C1272D] transition p-2 hover:bg-red-50 rounded-full"
                title="Configuración"
             >
                <Settings size={22} />
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        
        {/* Dashboard Section */}
        <section>
             <DashboardStats 
                currentDate={currentDate} 
                payments={payments} 
                settings={settings}
                missedDates={missedDates}
             />
        </section>

        {/* Calendar Control */}
        <section className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-slate-800 capitalize">
                    {getMonthName(currentDate)}
                </h2>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleDownloadPDF}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#C1272D] bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                    >
                        <FileDown size={18} />
                        <span className="hidden sm:inline">Descargar Reporte</span>
                    </button>

                    <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm border border-slate-200">
                        <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 rounded-md text-slate-600 transition">
                            <ChevronLeft size={20} />
                        </button>
                        <button onClick={() => setCurrentDate(new Date())} className="text-sm font-medium px-3 text-slate-600 hover:text-[#C1272D]">
                            Hoy
                        </button>
                        <button onClick={handleNextMonth} className="p-2 hover:bg-slate-100 rounded-md text-slate-600 transition">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            <Calendar 
                currentDate={currentDate}
                payments={payments}
                onSelectDate={handleDateClick}
                missedDates={missedDates}
            />
        </section>

      </main>

      {/* Payment Entry Modal */}
      <PaymentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedDate={selectedDate}
        onSave={handleSavePayment}
        existingPayment={editingPayment}
      />

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />
    </div>
  );
};

export default App;