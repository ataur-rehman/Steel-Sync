export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
}

export function validateCNIC(cnic: string): boolean {
  const cleaned = cnic.replace(/\D/g, '');
  return cleaned.length === 13;
}

export function validatePositiveNumber(value: number): boolean {
  return value > 0;
}

export function validatePercentage(value: number): boolean {
  return value >= 0 && value <= 100;
}