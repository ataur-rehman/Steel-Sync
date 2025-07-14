export function formatCurrency(amount: number | undefined | null): string {
  const safeAmount = amount ?? 0;
  return `Rs. ${safeAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

export function calculateTotal(quantity: number, rate: number): number {
  const qtyInt = Math.round((quantity + Number.EPSILON) * 100);
  const rateInt = Math.round((rate + Number.EPSILON) * 100);
  return (qtyInt * rateInt) / 10000;
}

export function calculateDiscount(subtotal: number, discountPercent: number): number {
  const subtotalInt = Math.round((subtotal + Number.EPSILON) * 100);
  const discountInt = Math.round((discountPercent + Number.EPSILON) * 100);
  return (subtotalInt * discountInt) / 1000000; // 100 * 100 * 100 for percentage
}

export function calculateTax(amount: number, taxPercent: number): number {
  const amountInt = Math.round((amount + Number.EPSILON) * 100);
  const taxInt = Math.round((taxPercent + Number.EPSILON) * 100);
  return (amountInt * taxInt) / 1000000; // 100 * 100 * 100 for percentage
}

export function roundToTwo(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

// Currency calculation helpers
export function roundCurrency(amount: number): number {
  if (!isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function addCurrency(amount1: number, amount2: number): number {
  const a1Int = Math.round((amount1 + Number.EPSILON) * 100);
  const a2Int = Math.round((amount2 + Number.EPSILON) * 100);
  return (a1Int + a2Int) / 100;
}

export function subtractCurrency(amount1: number, amount2: number): number {
  const a1Int = Math.round((amount1 + Number.EPSILON) * 100);
  const a2Int = Math.round((amount2 + Number.EPSILON) * 100);
  return (a1Int - a2Int) / 100;
}

export function multiplyCurrency(amount: number, multiplier: number): number {
  const amountInt = Math.round((amount + Number.EPSILON) * 100);
  const multiplierInt = Math.round((multiplier + Number.EPSILON) * 100);
  return (amountInt * multiplierInt) / 10000;
}

export function divideCurrency(amount: number, divisor: number): number {
  if (divisor === 0) return 0;
  const amountInt = Math.round((amount + Number.EPSILON) * 100);
  const divisorInt = Math.round((divisor + Number.EPSILON) * 100);
  return roundCurrency(amountInt / divisorInt);
}