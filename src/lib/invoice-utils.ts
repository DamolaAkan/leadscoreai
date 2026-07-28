export function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function generateInvoiceNumber(lastNumber: string | null): string {
  if (!lastNumber) return "INV-001";
  const match = lastNumber.match(/INV-(\d+)/);
  if (!match) return "INV-001";
  const next = parseInt(match[1], 10) + 1;
  return `INV-${String(next).padStart(3, "0")}`;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "draft":
      return "#6b7280";
    case "sent":
      return "#3b82f6";
    case "paid":
      return "#22c55e";
    case "overdue":
      return "#ef4444";
    default:
      return "#6b7280";
  }
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function calculateSubtotal(lineItems: { quantity: number; unit_price: number }[]): number {
  return lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
}

export function calculateTotalCharges(lineItems: { quantity: number; unit_price: number; type?: "charge" | "payment" }[]): number {
  return lineItems
    .filter((item) => !item.type || item.type === "charge")
    .reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
}

export function calculateTotalPayments(lineItems: { quantity: number; unit_price: number; type?: "charge" | "payment" }[]): number {
  return lineItems
    .filter((item) => item.type === "payment")
    .reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
}

// Charge line items that have been individually marked paid (e.g. a milestone
// paid and receipted). These reduce the balance the same as a deduction does.
export function calculateTotalPaidCharges(lineItems: { quantity: number; unit_price: number; type?: "charge" | "payment"; paid?: boolean }[]): number {
  return lineItems
    .filter((item) => (!item.type || item.type === "charge") && item.paid)
    .reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
}

export function calculateBalanceDue(lineItems: { quantity: number; unit_price: number; type?: "charge" | "payment"; paid?: boolean }[]): number {
  return (
    calculateTotalCharges(lineItems) -
    calculateTotalPayments(lineItems) -
    calculateTotalPaidCharges(lineItems)
  );
}

export function generateReceiptNumber(invoiceNumber: string, lineItemIndex: number): string {
  const num = invoiceNumber.replace("INV-", "");
  return `REC-${num}-${String(lineItemIndex + 1).padStart(2, "0")}`;
}
