import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Calendar, User, DollarSign, Clock, AlertTriangle, RotateCcw, Download, Upload, Database } from 'lucide-react';
import { EmployeeSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: EmployeeSettings;
  onSave: (newSettings: EmployeeSettings) => void;
  onReset?: () => void;
  onExport?: () => void;
  onImport?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  settings, 
  onSave, 
  onReset,
  onExport,
  onImport 
}) => {
  const [formData, setFormData] = useState<EmployeeSettings>(settings);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFormData(settings);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleResetClick = () => {
    const code = prompt("Introduce la clave para reiniciar a cero:");
    if (code && code.trim() === "2333") {
        if (onReset) {
            onReset();
            onClose();
        }
    } else if (code !== null) {
        // As requested: saltar anuncio de no esta autorizado
        alert("no esta autorizado");
    }
  };

  const WEEKDAYS = [
    { value: 0, label: 'Domingo' },
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in transition-colors duration-300 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 sticky top-0 z-10">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Configuración</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre del Empleado</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-slate-400" size={16} />
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="pl-9 w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-750 text-slate-700 dark:text-white border focus:border-[#C1272D] focus:ring-1 focus:ring-[#C1272D] p-2.5 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Monto Esperado</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 text-slate-400" size={16} />
                  <input
                    type="number"
                    required
                    value={formData.expectedAmount}
                    onChange={(e) => setFormData({...formData, expectedAmount: parseFloat(e.target.value)})}
                    className="pl-9 w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-750 text-slate-700 dark:text-white border focus:border-[#C1272D] focus:ring-1 focus:ring-[#C1272D] p-2.5 transition-colors"
                  />
                </div>
             </div>
             
             <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Día de Pago</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 text-slate-400" size={16} />
                  <select
                    value={formData.weeklyPaymentDay}
                    onChange={(e) => setFormData({...formData, weeklyPaymentDay: parseInt(e.target.value)})}
                    className="pl-9 w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-750 text-slate-700 dark:text-white border focus:border-[#C1272D] focus:ring-1 focus:ring-[#C1272D] p-2.5 transition-colors appearance-none"
                  >
                    {WEEKDAYS.map(day => (
                        <option key={day.value} value={day.value}>{day.label}</option>
                    ))}
                  </select>
                </div>
             </div>
          </div>

          {/* Date Range Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Fecha Inicio</label>
                <div className="relative">
                <Calendar className="absolute left-3 top-3 text-slate-400" size={16} />
                <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className="pl-9 w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-750 text-slate-700 dark:text-white border focus:border-[#C1272D] focus:ring-1 focus:ring-[#C1272D] p-2.5 transition-colors"
                />
                </div>
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Fecha Final <span className="text-[10px] text-slate-400">(Opcional)</span></label>
                <div className="relative">
                <Calendar className="absolute left-3 top-3 text-slate-400" size={16} />
                <input
                    type="date"
                    value={formData.endDate || ''}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    className="pl-9 w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-750 text-slate-700 dark:text-white border focus:border-[#C1272D] focus:ring-1 focus:ring-[#C1272D] p-2.5 transition-colors"
                    placeholder="Abierto"
                />
                </div>
            </div>
          </div>
          <p className="text-xs text-slate-400 -mt-2">Define el rango del periodo laboral. Dejar la fecha final vacía mantendrá el conteo hasta hoy.</p>

          <div className="pt-2">
            <button
                type="submit"
                className="w-full py-3 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white font-semibold rounded-xl shadow-lg shadow-slate-200 dark:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
                <Save size={18} />
                Guardar Configuración
            </button>
          </div>

           {/* Backup Section */}
           {(onExport || onImport) && (
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
               <h4 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1">
                  <Database size={12} /> Copia de Seguridad
               </h4>
               <div className="flex gap-3">
                  {onExport && (
                    <button
                        type="button"
                        onClick={onExport}
                        className="flex-1 py-2 px-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <Download size={16} />
                        Descargar
                    </button>
                  )}
                  {onImport && (
                    <>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 py-2 px-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <Upload size={16} />
                            Cargar
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={onImport}
                            accept=".json"
                            className="hidden"
                        />
                    </>
                  )}
               </div>
               <p className="text-[10px] text-slate-400 mt-2 text-center">
                  Descarga tus datos para no perderlos en futuras actualizaciones.
               </p>
            </div>
          )}

          {/* Danger Zone */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
             <h4 className="text-red-600 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1">
                <AlertTriangle size={12} /> Zona de Peligro
             </h4>
             <button
                type="button"
                onClick={handleResetClick}
                className="w-full py-2 px-4 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
             >
                <RotateCcw size={16} />
                Reiniciar a cero
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};