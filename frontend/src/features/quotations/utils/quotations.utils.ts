export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function calculateLineTotal(quantity: number, unitPrice: number, discountPct: number = 0): number {
  const subtotal = quantity * unitPrice;
  return subtotal * (1 - discountPct / 100);
}
