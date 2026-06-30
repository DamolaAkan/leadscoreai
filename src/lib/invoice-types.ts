export interface InvoiceClient {
  id: string;
  name: string;
  company: string | null;
  email: string;
  currency: string;
  notes: string | null;
  created_at: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  type?: "charge" | "payment";
  paid?: boolean;
  paid_date?: string | null;
}

export interface BankDetails {
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  sort_code?: string;
  iban?: string;
  swift?: string;
}

export interface Invoice {
  id: string;
  client_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  line_items: InvoiceLineItem[];
  subtotal: number;
  currency: string;
  bank_details: BankDetails;
  notes: string | null;
  status: "draft" | "sent" | "paid" | "overdue";
  sent_at: string | null;
  paid_at: string | null;
  is_recurring: boolean;
  recurring_template_id: string | null;
  created_at: string;
  // Joined fields
  client?: InvoiceClient;
}

export interface RecurringInvoice {
  id: string;
  client_id: string;
  line_items: InvoiceLineItem[];
  subtotal: number;
  currency: string;
  bank_details: BankDetails;
  notes: string | null;
  send_day: number;
  is_active: boolean;
  last_sent_at: string | null;
  created_at: string;
  // Joined fields
  client?: InvoiceClient;
}

export interface InvoiceSendLog {
  id: string;
  invoice_id: string;
  sent_at: string;
}

export interface InvoiceDashboardStats {
  total_invoices: number;
  total_revenue: number;
  outstanding_amount: number;
  overdue_count: number;
}
