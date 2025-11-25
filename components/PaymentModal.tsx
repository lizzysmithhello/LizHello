import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Loader2, Camera, Calendar as CalendarIcon, DollarSign, FileText } from 'lucide-react';
import { extractTicketData } from '../services/geminiService';
import { Payment } from '../types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  onSave: (payment: Omit<Payment, 'id'>) => void;
  existingPayment?: Payment;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, selectedDate, onSave, existingPayment }) => {
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(selectedDate);
  const [note, setNote] = useState<string>('');
  const [image, setImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (existingPayment) {
        setAmount(existingPayment.amount.toString());
        setDate(existingPayment.date);
        setNote(existingPayment.note || '');
        setImage(existingPayment.receiptImage || null);
      } else {
        setAmount('');
        setDate(selectedDate);
        setNote('');
        setImage(null);
      }
    }
  }, [isOpen, selectedDate, existingPayment]);

  if (!isOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1]; // Remove data url prefix
      
      setImage(base64String);

      // Call Gemini API
      try {
        const data = await extractTicketData(base64Data);
        if (data.amount) setAmount(data.amount.toString());
        if (data.date) setDate(data.date);
      } catch (err) {
        console.error("Failed to process image with AI", err);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !date) return;

    onSave({
      date,
      amount: parseFloat(amount),
      note,
      receiptImage: image || undefined
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800">
            {existingPayment ? 'Editar Pago' : 'Registrar Pago'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* File Upload Area */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Comprobante / Ticket</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-[#C1272D] hover:bg-red-50 transition-colors h-40 relative overflow-hidden group"
            >
              {image ? (
                <img src={image} alt="Ticket Preview" className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-40 transition-opacity" />
              ) : null}
              
              <div className="relative z-10 flex flex-col items-center">
                {isProcessing ? (
                  <>
                    <Loader2 className="animate-spin text-[#C1272D] mb-2" size={32} />
                    <span className="text-sm text-[#C1272D] font-medium">Analizando con Gemini AI...</span>
                  </>
                ) : (
                  <>
                    {image ? (
                        <div className="bg-white/90 p-2 rounded-full shadow-sm text-slate-700">
                            <Camera size={24} />
                        </div>
                    ) : (
                        <>
                            <Upload className="text-slate-400 mb-2" size={32} />
                            <span className="text-sm text-slate-500 text-center">Toca para escanear o subir ticket</span>
                        </>
                    )}
                  </>
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageUpload}
              />
            </div>
            {image && !isProcessing && (
                <p className="text-xs text-green-600 text-center">¡Datos extraídos! Verifica si son correctos.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Fecha</label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-3 text-slate-400" size={16} />
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="pl-9 w-full rounded-lg border-slate-300 border focus:border-[#C1272D] focus:ring-1 focus:ring-[#C1272D] p-2.5 text-slate-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Monto</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 text-slate-400" size={16} />
                <input
                  type="number"
                  required
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-9 w-full rounded-lg border-slate-300 border focus:border-[#C1272D] focus:ring-1 focus:ring-[#C1272D] p-2.5 text-slate-700 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Notas (Opcional)</label>
            <div className="relative">
                <FileText className="absolute left-3 top-3 text-slate-400" size={16} />
                <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="pl-9 w-full rounded-lg border-slate-300 border focus:border-[#C1272D] focus:ring-1 focus:ring-[#C1272D] p-2.5 text-slate-700 text-sm"
                rows={2}
                placeholder="Detalles adicionales..."
                />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[#C1272D] hover:bg-red-700 text-white font-semibold rounded-xl shadow-lg shadow-red-200 transition-all active:scale-[0.98] mt-2"
          >
            Guardar Pago
          </button>
        </form>
      </div>
    </div>
  );
};