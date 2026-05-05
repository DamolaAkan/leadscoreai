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
      return "#7C3AED";
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
