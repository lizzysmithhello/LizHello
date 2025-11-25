import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Loader2, Camera, Calendar as CalendarIcon, DollarSign, FileText, Trash2, SwitchCamera, RefreshCw } from 'lucide-react';
import { extractTicketData } from '../services/geminiService';
import { Payment } from '../types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  onSave: (payment: Omit<Payment, 'id'>) => void;
  onDelete?: (id: string) => void;
  existingPayment?: Payment;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, selectedDate, onSave, onDelete, existingPayment }) => {
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(selectedDate);
  const [note, setNote] = useState<string>('');
  const [image, setImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
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
      setIsCameraOpen(false); // Reset camera state on open
    }
  }, [isOpen, selectedDate, existingPayment]);

  // Camera Logic
  useEffect(() => {
    let stream: MediaStream | null = null;

    if (isCameraOpen) {
      const startCamera = async () => {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.error("Camera error", err);
          setIsCameraOpen(false);
          alert("No se pudo acceder a la cámara. Verifique los permisos.");
        }
      };
      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraOpen]);

  if (!isOpen) return null;

  const processImageWithAI = async (base64Data: string) => {
    setIsProcessing(true);
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1]; // Remove data url prefix
      setImage(base64String);
      await processImageWithAI(base64Data);
    };
    reader.readAsDataURL(file);
  };

  const handleCapturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const base64String = canvas.toDataURL('image/jpeg');
        setImage(base64String);
        setIsCameraOpen(false);
        
        const base64Data = base64String.split(',')[1];
        processImageWithAI(base64Data);
      }
    }
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
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent form submit
    if (existingPayment && onDelete) {
        if (window.confirm('¿Eliminar este registro de pago? La casilla quedará libre para registrar un nuevo pago.')) {
            // Limpiar los campos del formulario explícitamente
            setAmount('');
            setNote('');
            setImage(null);
            
            // Ejecutar la eliminación del pago existente
            onDelete(existingPayment.id);
        }
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
      e.stopPropagation();
      setImage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in transition-colors duration-300 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 shrink-0">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">
            {existingPayment ? 'Editar Pago' : 'Registrar Pago'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* File Upload / Camera Area */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Comprobante / Ticket</label>
              
              <div 
                className={`
                  border-2 border-dashed rounded-xl overflow-hidden relative transition-colors h-48 sm:h-52 flex flex-col items-center justify-center group
                  ${isCameraOpen ? 'border-transparent bg-black' : 'border-slate-300 dark:border-slate-600 hover:border-[#C1272D] hover:bg-slate-50 dark:hover:bg-slate-750'}
                `}
              >
                {/* 1. Camera View */}
                {isCameraOpen ? (
                  <div className="absolute inset-0 flex flex-col">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 z-10">
                      <button 
                        type="button"
                        onClick={() => setIsCameraOpen(false)}
                        className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors"
                      >
                        <X size={24} />
                      </button>
                      <button 
                        type="button"
                        onClick={handleCapturePhoto}
                        className="p-3 bg-white rounded-full text-[#C1272D] shadow-lg hover:scale-105 transition-transform"
                      >
                        <div className="w-6 h-6 rounded-full border-2 border-[#C1272D] flex items-center justify-center">
                            <div className="w-4 h-4 bg-[#C1272D] rounded-full"></div>
                        </div>
                      </button>
                    </div>
                  </div>
                ) : (
                  // 2. Image Preview or Selection UI
                  <>
                    {image ? (
                      <div className="relative w-full h-full">
                        <img src={image} alt="Ticket Preview" className="w-full h-full object-contain bg-slate-100 dark:bg-slate-900" />
                        
                        {isProcessing && (
                          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center backdrop-blur-[2px]">
                             <Loader2 className="animate-spin text-white mb-2" size={32} />
                             <span className="text-white font-medium text-sm text-shadow">Analizando ticket...</span>
                          </div>
                        )}

                        <button 
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors"
                        >
                          <X size={16} />
                        </button>
                        
                        {!isProcessing && (
                             <div className="absolute bottom-2 left-0 right-0 text-center">
                                <p className="text-xs text-white/90 bg-black/40 inline-block px-2 py-1 rounded-md">Ticket adjunto</p>
                             </div>
                        )}
                      </div>
                    ) : (
                      // 3. Selection Actions
                      <div className="flex flex-col items-center gap-4 w-full h-full justify-center p-4">
                          <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex flex-col items-center gap-1 text-slate-500 hover:text-[#C1272D] dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                          >
                             <Upload size={32} />
                             <span className="text-sm font-medium">Subir Imagen</span>
                          </button>
                          
                          <div className="flex items-center gap-2 w-full max-w-[200px]">
                              <div className="h-px bg-slate-300 dark:bg-slate-600 flex-1"></div>
                              <span className="text-xs text-slate-400">O</span>
                              <div className="h-px bg-slate-300 dark:bg-slate-600 flex-1"></div>
                          </div>

                          <button 
                            type="button"
                            onClick={() => setIsCameraOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors"
                          >
                             <Camera size={18} />
                             <span>Usar Cámara</span>
                          </button>
                      </div>
                    )}
                  </>
                )}
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleImageUpload}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Fecha</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-3 text-slate-400" size={16} />
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="pl-9 w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-750 text-slate-700 dark:text-white border focus:border-[#C1272D] focus:ring-1 focus:ring-[#C1272D] p-2.5 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Monto</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 text-slate-400" size={16} />
                  <input
                    type="number"
                    required
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-9 w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-750 text-slate-700 dark:text-white border focus:border-[#C1272D] focus:ring-1 focus:ring-[#C1272D] p-2.5 font-mono transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Notas (Opcional)</label>
              <div className="relative">
                  <FileText className="absolute left-3 top-3 text-slate-400" size={16} />
                  <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="pl-9 w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-750 text-slate-700 dark:text-white border focus:border-[#C1272D] focus:ring-1 focus:ring-[#C1272D] p-2.5 text-sm transition-colors"
                  rows={2}
                  placeholder="Detalles adicionales..."
                  />
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-4 pt-2">
              <button
                  type="submit"
                  className="w-full py-3 bg-[#C1272D] hover:bg-red-700 text-white font-semibold rounded-xl shadow-lg shadow-red-200 dark:shadow-none transition-all active:scale-[0.98]"
              >
                  Guardar Pago
              </button>

              {existingPayment && (
                  <button
                      type="button"
                      onClick={handleDelete}
                      className="w-full py-2 flex items-center justify-center gap-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 font-medium rounded-xl transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-900"
                  >
                      <Trash2 size={18} />
                      Eliminar Pago
                  </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};