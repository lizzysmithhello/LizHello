import React, { useState, useEffect, useMemo } from 'react';
import { Calendar } from './components/Calendar';
import { PaymentModal } from './components/PaymentModal';
import { DashboardStats } from './components/DashboardStats';
import { SettingsModal } from './components/SettingsModal';
import { Payment, EmployeeSettings } from './types';
import { getMonthName, toISODate, isSameWeek } from './utils/dateUtils';
import { generateMonthlyReport, generateTotalReport } from './utils/pdfGenerator';
import { ChevronLeft, ChevronRight, Settings, User, FileDown, Moon, Sun, FileText } from 'lucide-react';

// Helper for safe ID generation
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

const App: React.FC = () => {
  // --- State ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(toISODate(new Date()));
  const [editingPayment, setEditingPayment] = useState<Payment | undefined>(undefined);
  
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pagotrack_theme') as 'light' | 'dark' || 'light';
    }
    return 'light';
  });

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
        // Seed some dummy data for demonstration if empty
        // Only if user hasn't explicitly cleared it (we can't easily know that without another flag, 
        // but let's assume if it's null we seed, if it's [] we don't. localStorage returns null if missing)
        if (saved === null) {
            const today = new Date();
            const dummy: Payment[] = [
                { id: '1', date: toISODate(new Date(today.getFullYear(), today.getMonth(), 5)), amount: 2500, note: 'Pago semana 1' },
                { id: '2', date: toISODate(new Date(today.getFullYear(), today.getMonth(), 12)), amount: 2500, note: 'Pago semana 2' },
            ];
            setPayments(dummy);
        }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('pagotrack_payments', JSON.stringify(payments));
  }, [payments]);

  useEffect(() => {
    localStorage.setItem('pagotrack_settings', JSON.stringify(settings));
  }, [settings]);

  // Apply theme
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('pagotrack_theme', theme);
  }, [theme]);

  // --- Logic ---
  
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

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
      let newPayments = [...prev];

      if (editingPayment) {
        // EDIT MODE:
        // 1. Remove the original payment (by ID) so we don't duplicate if the date changed
        newPayments = newPayments.filter(p => p.id !== editingPayment.id);
        
        // 2. Add the updated payment using the SAME ID
        newPayments.push({
          ...data,
          id: editingPayment.id
        });
      } else {
        // NEW MODE:
        // 1. Remove any existing payment on this target date (Enforce 1 payment per day constraint)
        newPayments = newPayments.filter(p => p.date !== data.date);
        
        // 2. Add new payment with NEW ID
        newPayments.push({
          ...data,
          id: generateId()
        });
      }

      // Sort by date
      return newPayments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });
    setIsModalOpen(false);
    setEditingPayment(undefined);
  };

  const handleDeletePayment = (id: string) => {
    setPayments(prev => prev.filter(p => p.id !== id));
    setIsModalOpen(false);
    setEditingPayment(undefined);
  };

  const handleSaveSettings = (newSettings: EmployeeSettings) => {
      setSettings(newSettings);
  };

  const handleResetApp = () => {
    // Reset Settings to default
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const defaultSettings = {
        name: "Juan Pérez",
        weeklyPaymentDay: 5,
        expectedAmount: 2500,
        startDate: toISODate(startOfYear)
    };
    
    // Update Local Storage directly and force reload
    localStorage.setItem('pagotrack_payments', JSON.stringify([]));
    localStorage.setItem('pagotrack_settings', JSON.stringify(defaultSettings));
    
    alert("Sistema reiniciado a cero correctamente. La página se recargará ahora.");
    window.location.reload();
  };

  // --- Backup Logic ---
  const handleExportBackup = () => {
    const backupData = {
      version: 1,
      timestamp: new Date().toISOString(),
      settings,
      payments
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `pagotrack_backup_${toISODate(new Date())}.json`);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        // Basic validation
        if (json.payments && Array.isArray(json.payments)) {
            setPayments(json.payments);
        }
        if (json.settings && typeof json.settings === 'object') {
            setSettings(json.settings);
        }
        
        alert("Copia de seguridad restaurada correctamente.");
      } catch (err) {
        console.error(err);
        alert("Error al leer el archivo. Asegúrate de que sea un archivo de respaldo válido (.json).");
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again if needed
    e.target.value = '';
  };

  const handleDownloadMonthlyPDF = () => {
      generateMonthlyReport(currentDate, payments, settings);
  };

  const handleDownloadTotalPDF = () => {
      generateTotalReport(payments, settings);
  };

  // Calculate missed payments
  // Updated Logic: Check by WEEK, not just by exact day.
  const missedDates = useMemo(() => {
    const missed: string[] = [];
    
    // Parse start date
    const start = new Date(settings.startDate + 'T00:00:00'); // Ensure local time
    const today = new Date();
    
    // Find the first required payment day (e.g., Friday) on or after start date
    let iterator = new Date(start);
    while (iterator.getDay() !== settings.weeklyPaymentDay) {
        iterator.setDate(iterator.getDate() + 1);
    }

    // Loop through every expected payment week until today
    while (iterator <= today) {
        const expectedDate = new Date(iterator);
        
        // Check if ANY payment exists within the same week as the expected date
        // This allows paying on Thursday for a Friday deadline without flagging as missed
        const hasPaymentInWeek = payments.some(p => {
             const paymentDate = new Date(p.date + 'T00:00:00');
             return isSameWeek(paymentDate, expectedDate);
        });

        if (!hasPaymentInWeek) {
            missed.push(toISODate(expectedDate));
        }

        // Move to next week
        iterator.setDate(iterator.getDate() + 7);
    }

    return missed;
  }, [payments, settings.weeklyPaymentDay, settings.startDate]);


  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30 shadow-sm transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Logo Recreation: CENTRO MEAVE 6 */}
            <div className="flex items-baseline leading-none select-none tracking-tighter">
                <span className="text-2xl md:text-3xl font-bold text-[#C1272D]">CENTRO</span>
                <span className="text-2xl md:text-3xl font-light text-black dark:text-white mx-1">MEAVE</span>
                <span className="text-4xl md:text-5xl font-bold text-[#C1272D]">6</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 md:gap-6">
             <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">Pagos a</span>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    <User size={18} className="text-[#C1272D]" />
                    <span className="font-bold text-lg leading-tight">{settings.name}</span>
                </div>
             </div>
             
             {/* Theme Toggle - Slider */}
             <div
               onClick={toggleTheme}
               className={`w-14 h-7 flex items-center bg-slate-200 dark:bg-slate-700 rounded-full p-1 cursor-pointer transition-colors duration-300 border border-slate-300 dark:border-slate-600`}
               title="Cambiar modo"
             >
               <div
                 className={`bg-white dark:bg-slate-300 w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center ${
                   theme === 'dark' ? 'translate-x-7' : 'translate-x-0'
                 }`}
               >
                 {theme === 'dark' ? (
                   <Moon size={12} className="text-slate-800" /> 
                 ) : (
                   <Sun size={12} className="text-amber-500" />
                 )}
               </div>
             </div>

             <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
             
             <button 
                onClick={() => setIsSettingsOpen(true)}
                className="text-slate-400 hover:text-[#C1272D] transition p-2 hover:bg-red-50 dark:hover:bg-slate-700 rounded-full"
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
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white capitalize transition-colors">
                    {getMonthName(currentDate)}
                </h2>
                
                <div className="flex flex-wrap items-center gap-3">
                    {/* Botones de Reporte */}
                    <div className="flex gap-2">
                        <button 
                            onClick={handleDownloadMonthlyPDF}
                            className="flex items-center gap-2 px-3 py-2 text-xs md:text-sm font-medium text-[#C1272D] bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors border border-red-100 dark:border-red-900/30"
                        >
                            <FileDown size={16} />
                            <span>Reporte Mensual</span>
                        </button>
                        
                        <button 
                            onClick={handleDownloadTotalPDF}
                            className="flex items-center gap-2 px-3 py-2 text-xs md:text-sm font-medium text-white bg-[#C1272D] hover:bg-red-700 rounded-lg transition-colors shadow-sm"
                        >
                            <FileText size={16} />
                            <span>Reporte Total</span>
                        </button>
                    </div>

                    <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>

                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg p-1 shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                        <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md text-slate-600 dark:text-slate-400 transition">
                            <ChevronLeft size={20} />
                        </button>
                        <button onClick={() => setCurrentDate(new Date())} className="text-sm font-medium px-3 text-slate-600 dark:text-slate-300 hover:text-[#C1272D]">
                            Hoy
                        </button>
                        <button onClick={handleNextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md text-slate-600 dark:text-slate-400 transition">
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
        key={selectedDate} /* Force re-render on date change to ensure fresh state */
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedDate={selectedDate}
        onSave={handleSavePayment}
        onDelete={handleDeletePayment}
        existingPayment={editingPayment}
      />

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
        onReset={handleResetApp}
        onExport={handleExportBackup}
        onImport={handleImportBackup}
      />
    </div>
  );
};

export default App;