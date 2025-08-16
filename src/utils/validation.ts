// Input validation and sanitization utilities
// This file provides security-focused input validation and sanitization functions

// HTML entity encoding to prevent XSS
export const escapeHtml = (text: string): string => {
  if (typeof text !== 'string') return '';
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// Comprehensive input sanitization
export const sanitizeInput = (input: string, options: {
  maxLength?: number;
  allowHtml?: boolean;
  allowSpecialChars?: boolean;
  numericOnly?: boolean;
} = {}): string => {
  if (typeof input !== 'string') return '';
  
  let sanitized = input.trim();
  
  // Apply length limit
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }
  
  // Remove HTML if not allowed
  if (!options.allowHtml) {
    sanitized = escapeHtml(sanitized);
  }
  
  // Remove special characters if not allowed
  if (!options.allowSpecialChars) {
    sanitized = sanitized.replace(/[<>\"'%;()&+]/g, '');
  }
  
  // Keep only numeric characters if numeric only
  if (options.numericOnly) {
    sanitized = sanitized.replace(/[^0-9.-]/g, '');
  }
  
  return sanitized;
};

// Validate customer name
export const validateCustomerName = (name: string): { isValid: boolean; error?: string } => {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: 'Customer name is required' };
  }
  
  if (name.length > 100) {
    return { isValid: false, error: 'Customer name must be less than 100 characters' };
  }
  
  // Check for potential XSS patterns
  const xssPatterns = [/<script/i, /javascript:/i, /on\w+\s*=/i, /<iframe/i, /<object/i];
  if (xssPatterns.some(pattern => pattern.test(name))) {
    return { isValid: false, error: 'Customer name contains invalid characters' };
  }
  
  return { isValid: true };
};

// Validate description field
export const validateDescription = (description: string): { isValid: boolean; error?: string } => {
  if (!description || description.trim().length === 0) {
    return { isValid: false, error: 'Description is required' };
  }
  
  if (description.length > 500) {
    return { isValid: false, error: 'Description must be less than 500 characters' };
  }
  
  // Check for SQL injection patterns
  const sqlPatterns = [/union\s+select/i, /drop\s+table/i, /delete\s+from/i, /insert\s+into/i, /--/, /\/\*/];
  if (sqlPatterns.some(pattern => pattern.test(description))) {
    return { isValid: false, error: 'Description contains invalid characters' };
  }
  
  return { isValid: true };
};

// Validate monetary amount
export const validateAmount = (amount: number | string): { isValid: boolean; error?: string; value?: number } => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return { isValid: false, error: 'Amount must be a valid number' };
  }
  
  if (numAmount < 0) {
    return { isValid: false, error: 'Amount cannot be negative' };
  }
  
  if (numAmount > 999999999) { // 999 million limit
    return { isValid: false, error: 'Amount is too large' };
  }
  
  // Check for more than 2 decimal places
  const decimalPlaces = (numAmount.toString().split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    return { isValid: false, error: 'Amount cannot have more than 2 decimal places' };
  }
  
  return { isValid: true, value: numAmount };
};

// Validate notes field
export const validateNotes = (notes: string): { isValid: boolean; error?: string } => {
  if (notes.length > 1000) {
    return { isValid: false, error: 'Notes must be less than 1000 characters' };
  }
  
  // Check for path traversal patterns
  const pathPatterns = [/\.\./g, /\/etc\//i, /\/var\//i, /\/tmp\//i, /\\windows\\/i, /\\system32\\/i];
  if (pathPatterns.some(pattern => pattern.test(notes))) {
    return { isValid: false, error: 'Notes contain invalid characters' };
  }
  
  return { isValid: true };
};

// Validate quantity input
export const validateQuantity = (quantity: string, unitType: string = 'kg-grams'): { isValid: boolean; error?: string } => {
  if (!quantity || quantity.trim().length === 0) {
    return { isValid: false, error: 'Quantity is required' };
  }
  
  const trimmedQuantity = quantity.trim();
  
  if (unitType === 'kg-grams') {
    // Validate kg-grams format
    if (trimmedQuantity.includes('-')) {
      const parts = trimmedQuantity.split('-');
      if (parts.length !== 2) {
        return { isValid: false, error: 'Invalid kg-grams format. Use format: 155-20' };
      }
      
      const kg = parseFloat(parts[0]);
      const grams = parseFloat(parts[1]);
      
      if (isNaN(kg) || isNaN(grams)) {
        return { isValid: false, error: 'Kg and grams must be valid numbers' };
      }
      
      if (kg < 0 || grams < 0) {
        return { isValid: false, error: 'Quantity cannot be negative' };
      }
      
      if (grams >= 1000) {
        return { isValid: false, error: 'Grams part must be less than 1000' };
      }
      
      if (kg > 999999) {
        return { isValid: false, error: 'Quantity is too large' };
      }
      
    } else {
      // Single number format
      const numericValue = parseFloat(trimmedQuantity.replace(/[kg]/gi, ''));
      if (isNaN(numericValue) || numericValue < 0) {
        return { isValid: false, error: 'Quantity must be a positive number' };
      }
    }
  } else {
    // For pieces and other units
    const numericValue = parseFloat(trimmedQuantity);
    if (isNaN(numericValue) || numericValue < 0) {
      return { isValid: false, error: 'Quantity must be a positive number' };
    }
    
    if (numericValue > 999999) {
      return { isValid: false, error: 'Quantity is too large' };
    }
  }
  
  return { isValid: true };
};

// Comprehensive form validation for invoice
export const validateInvoiceForm = (formData: any): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  // Validate customer selection
  if (!formData.customer_id) {
    errors.customer_id = 'Please select a customer';
  }
  
  // Validate items
  if (!formData.items || formData.items.length === 0) {
    errors.items = 'Please add at least one item';
  } else {
    formData.items.forEach((item: any, index: number) => {
      const quantityValidation = validateQuantity(item.quantity, item.unit_type);
      if (!quantityValidation.isValid) {
        errors[`item_${index}_quantity`] = quantityValidation.error || 'Invalid quantity';
      }
      
      const priceValidation = validateAmount(item.unit_price);
      if (!priceValidation.isValid) {
        errors[`item_${index}_price`] = priceValidation.error || 'Invalid price';
      }
    });
  }
  
  // Validate discount
  const discountValidation = validateAmount(formData.discount || 0);
  if (!discountValidation.isValid) {
    errors.discount = discountValidation.error || 'Invalid discount';
  } else if ((discountValidation.value || 0) > 100) {
    errors.discount = 'Discount cannot exceed 100%';
  }
  
  // Validate payment amount
  const paymentValidation = validateAmount(formData.payment_amount || 0);
  if (!paymentValidation.isValid) {
    errors.payment_amount = paymentValidation.error || 'Invalid payment amount';
  }
  
  // Validate notes if present
  if (formData.notes) {
    const notesValidation = validateNotes(formData.notes);
    if (!notesValidation.isValid) {
      errors.notes = notesValidation.error || 'Invalid notes';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Rate limiting helper (for preventing spam)
class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();
  
  public isAllowed(key: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);
    
    if (!record || now > record.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    if (record.count >= maxAttempts) {
      return false;
    }
    
    record.count++;
    return true;
  }
  
  public getRemainingAttempts(key: string, maxAttempts: number = 5): number {
    const record = this.attempts.get(key);
    if (!record || Date.now() > record.resetTime) {
      return maxAttempts;
    }
    return Math.max(0, maxAttempts - record.count);
  }
}

export const rateLimiter = new RateLimiter();

// Input sanitization for database queries (additional layer)
export const sanitizeForDatabase = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/'/g, "''") // Escape single quotes
    .replace(/\\/g, '\\\\') // Escape backslashes
    .replace(/\x00/g, '\\0') // Escape null bytes
    .replace(/\n/g, '\\n') // Escape newlines
    .replace(/\r/g, '\\r') // Escape carriage returns
    .replace(/\x1a/g, '\\Z'); // Escape ctrl+Z
};

// CSRF token generation and validation
export const generateCSRFToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

export const validateCSRFToken = (token: string, storedToken: string): boolean => {
  if (!token || !storedToken || token.length !== storedToken.length) {
    return false;
  }
  
  // Constant-time comparison to prevent timing attacks
  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ storedToken.charCodeAt(i);
  }
  
  return result === 0;
};
