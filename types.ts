export interface Payment {
  id: string;
  date: string; // ISO YYYY-MM-DD
  amount: number;
  note?: string;
  receiptImage?: string; // Base64 string
}

export interface EmployeeSettings {
  name: string;
  weeklyPaymentDay: number; // 0 = Sunday, 1 = Monday, etc.
  expectedAmount: number;
  startDate: string; // ISO YYYY-MM-DD
}

export interface Alert {
  id: string;
  type: 'missed_payment' | 'info';
  message: string;
  date: string;
}

export interface TicketExtractionResult {
  date: string | null;
  amount: number | null;
}