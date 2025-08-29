export function formatCurrency(amount: number | undefined | null): string {
  const safeAmount = (amount ?? 0);
  // Handle NaN values
  const finalAmount = isNaN(safeAmount) ? 0 : safeAmount;
  // Show no decimal places for whole numbers, one decimal place for others
  if (finalAmount % 1 === 0) {
    return `Rs. ${finalAmount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  } else {
    return `Rs. ${finalAmount.toFixed(1).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  }
}

export function calculateTotal(quantity: number, rate: number): number {
  const qtyInt = Math.round((quantity + Number.EPSILON) * 10);
  const rateInt = Math.round((rate + Number.EPSILON) * 10);
  return (qtyInt * rateInt) / 100;
}

export function calculateDiscount(subtotal: number, discountPercent: number): number {
  const subtotalInt = Math.round((subtotal + Number.EPSILON) * 10);
  const discountInt = Math.round((discountPercent + Number.EPSILON) * 10);
  return (subtotalInt * discountInt) / 1000; // 10 * 10 * 10 for percentage
}

export function calculateTax(amount: number, taxPercent: number): number {
  const amountInt = Math.round((amount + Number.EPSILON) * 10);
  const taxInt = Math.round((taxPercent + Number.EPSILON) * 10);
  return (amountInt * taxInt) / 1000; // 10 * 10 * 10 for percentage
}

export function roundToTwo(num: number): number {
  return Math.round((num + Number.EPSILON) * 10) / 10; // Changed to 1 decimal place
}

// Currency calculation helpers
export function roundCurrency(amount: number): number {
  if (!isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 10) / 10; // Changed to 1 decimal place
}

export function addCurrency(amount1: number, amount2: number): number {
  const a1Int = Math.round((amount1 + Number.EPSILON) * 10);
  const a2Int = Math.round((amount2 + Number.EPSILON) * 10);
  return (a1Int + a2Int) / 10;
}

export function subtractCurrency(amount1: number, amount2: number): number {
  const a1Int = Math.round((amount1 + Number.EPSILON) * 10);
  const a2Int = Math.round((amount2 + Number.EPSILON) * 10);
  return (a1Int - a2Int) / 10;
}

export function multiplyCurrency(amount: number, multiplier: number): number {
  const amountInt = Math.round((amount + Number.EPSILON) * 10);
  const multiplierInt = Math.round((multiplier + Number.EPSILON) * 10);
  return (amountInt * multiplierInt) / 100;
}

export function divideCurrency(amount: number, divisor: number): number {
  if (divisor === 0) return 0;
  const amountInt = Math.round((amount + Number.EPSILON) * 100);
  const divisorInt = Math.round((divisor + Number.EPSILON) * 100);
  return roundCurrency(amountInt / divisorInt);
}