export function formatCurrency(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function calculateLineTotal(quantity: number, unitPrice: number, discountPct: number = 0): number {
  const subtotal = quantity * unitPrice;
  return subtotal * (1 - discountPct / 100);
}
