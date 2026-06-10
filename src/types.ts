export interface TimeEntry {
  id: string;
  startTime: number;
  endTime: number;
  projectName?: string;
}

export interface Project {
  id: string;
  name: string;
}

export type InvoiceStatus = 'Created' | 'Sent' | 'Paid';

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  projectId: string;
  month: string;
  dateCreated: number;
  status: InvoiceStatus;
  totalAmount: number;
}
