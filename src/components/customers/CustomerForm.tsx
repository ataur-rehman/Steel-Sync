import React, { useState } from 'react';
import { useDatabase } from '../../hooks/useDatabase';

import type { Customer } from '../../types';
import { toast } from 'react-hot-toast';

// ===== SECURITY VALIDATION UTILITIES =====

/**
 * Comprehensive input validation for customer form
 */

// XSS Protection - Sanitize HTML and dangerous characters while preserving spaces
const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') return '';

  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove <script> tags
    .replace(/<[^>]*>?/gm, '') // Remove HTML tags  
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers
  // Note: Not encoding common characters to preserve normal typing experience
  // Proper encoding will be done when saving to database
};

// Customer Name Validation
const validateCustomerName = (name: string): { isValid: boolean; error?: string } => {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return { isValid: false, error: 'Customer name is required' };
  }

  if (trimmedName.length < 2) {
    return { isValid: false, error: 'Customer name must be at least 2 characters' };
  }

  if (trimmedName.length > 100) {
    return { isValid: false, error: 'Customer name cannot exceed 100 characters' };
  }

  // Check for dangerous characters
  if (/[<>'"&;{}[\]\\|`~!@#$%^*()_+=]/.test(trimmedName)) {
    return { isValid: false, error: 'Customer name contains invalid characters' };
  }

  // Allow only letters, spaces, dots, hyphens
  if (!/^[a-zA-Z\s.\-]+$/.test(trimmedName)) {
    return { isValid: false, error: 'Customer name can only contain letters, spaces, dots, and hyphens' };
  }

  // Check for SQL injection patterns
  if (/\b(DROP|DELETE|INSERT|UPDATE|CREATE|ALTER|EXEC|UNION|SELECT|FROM|WHERE)\b/i.test(trimmedName)) {
    return { isValid: false, error: 'Invalid customer name format' };
  }

  return { isValid: true };
};

// Phone Number Validation
const validatePhoneNumber = (phone: string): { isValid: boolean; error?: string } => {
  const trimmedPhone = phone.trim();

  if (!trimmedPhone) {
    return { isValid: false, error: 'Phone number is required' };
  }

  if (trimmedPhone.length < 10) {
    return { isValid: false, error: 'Phone number must be at least 10 digits' };
  }

  if (trimmedPhone.length > 20) {
    return { isValid: false, error: 'Phone number cannot exceed 20 characters' };
  }

  // Check for dangerous characters
  if (/[<>'"&;{}[\]\\|`~!@#$%^*()_+=]/.test(trimmedPhone)) {
    return { isValid: false, error: 'Phone number contains invalid characters' };
  }

  // Allow only digits, spaces, hyphens, plus, parentheses
  if (!/^[\d\s\-+()]+$/.test(trimmedPhone)) {
    return { isValid: false, error: 'Phone number can only contain digits, spaces, hyphens, plus sign, and parentheses' };
  }

  // Check for minimum digit count (at least 10 digits)
  const digitCount = trimmedPhone.replace(/\D/g, '').length;
  if (digitCount < 10) {
    return { isValid: false, error: 'Phone number must contain at least 10 digits' };
  }

  if (digitCount > 15) {
    return { isValid: false, error: 'Phone number cannot contain more than 15 digits' };
  }

  return { isValid: true };
};

// Address Validation
const validateAddress = (address: string): { isValid: boolean; error?: string } => {
  if (!address.trim()) {
    return { isValid: true }; // Optional field
  }

  if (address.length > 200) {
    return { isValid: false, error: 'Address cannot exceed 200 characters' };
  }

  // Check for dangerous characters
  if (/[<>'"&;{}[\]\\|`~!@#$%^*()_+=]/.test(address)) {
    return { isValid: false, error: 'Address contains invalid characters' };
  }

  // Allow letters, numbers, spaces, dots, hyphens, commas
  if (!/^[a-zA-Z0-9\s.\-,/]+$/.test(address)) {
    return { isValid: false, error: 'Address can only contain letters, numbers, spaces, dots, hyphens, commas, and forward slashes' };
  }

  return { isValid: true };
};

// CNIC Validation
const validateCNIC = (cnic: string): { isValid: boolean; error?: string } => {
  if (!cnic.trim()) {
    return { isValid: true }; // Optional field
  }

  const trimmedCNIC = cnic.trim();

  if (trimmedCNIC.length > 20) {
    return { isValid: false, error: 'CNIC cannot exceed 20 characters' };
  }

  // Check for dangerous characters
  if (/[<>'"&;{}[\]\\|`~!@#$%^*()_+=]/.test(trimmedCNIC)) {
    return { isValid: false, error: 'CNIC contains invalid characters' };
  }

  // Allow only digits and hyphens
  if (!/^[\d\-]+$/.test(trimmedCNIC)) {
    return { isValid: false, error: 'CNIC can only contain digits and hyphens' };
  }

  // Check for valid CNIC format (Pakistani CNIC: XXXXX-XXXXXXX-X)
  const digitCount = trimmedCNIC.replace(/\D/g, '').length;
  if (digitCount !== 13) {
    return { isValid: false, error: 'CNIC must contain exactly 13 digits' };
  }

  // Check for valid format
  if (!/^\d{5}-\d{7}-\d{1}$/.test(trimmedCNIC)) {
    return { isValid: false, error: 'CNIC must be in format: 12345-1234567-1' };
  }

  return { isValid: true };
};

interface CustomerFormProps {
  customer?: Customer | null;
  onSuccess: () => void;
}

export default function CustomerForm({ customer, onSuccess }: CustomerFormProps) {
  const { db } = useDatabase();

  const [loading, setLoading] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    address: customer?.address || '',
    cnic: customer?.cnic || ''
  });

  // Generate unique field names to prevent browser from remembering
  const [fieldNames] = useState(() => ({
    name: `customer_name_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    phone: `customer_phone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    address: `customer_address_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    cnic: `customer_cnic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Map dynamic field names back to form data keys
    let fieldKey = '';
    if (name === fieldNames.name) fieldKey = 'name';
    else if (name === fieldNames.phone) fieldKey = 'phone';
    else if (name === fieldNames.address) fieldKey = 'address';
    else if (name === fieldNames.cnic) fieldKey = 'cnic';
    else return; // Unknown field

    // Sanitize input for security
    let sanitizedValue = sanitizeInput(value);

    setFormData(prev => ({ ...prev, [fieldKey]: sanitizedValue }));

    // Real-time validation feedback
    if (errors[fieldKey]) {
      let validationResult = { isValid: true };

      switch (fieldKey) {
        case 'name':
          validationResult = validateCustomerName(sanitizedValue);
          break;
        case 'phone':
          validationResult = validatePhoneNumber(sanitizedValue);
          break;
        case 'address':
          validationResult = validateAddress(sanitizedValue);
          break;
        case 'cnic':
          validationResult = validateCNIC(sanitizedValue);
          break;
      }

      if (validationResult.isValid) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[fieldKey];
          return newErrors;
        });
      }
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Customer name validation
    const nameValidation = validateCustomerName(formData.name);
    if (!nameValidation.isValid) {
      newErrors.name = nameValidation.error || 'Invalid customer name';
    }

    // Phone number validation
    const phoneValidation = validatePhoneNumber(formData.phone);
    if (!phoneValidation.isValid) {
      newErrors.phone = phoneValidation.error || 'Invalid phone number';
    }

    // Address validation (optional)
    const addressValidation = validateAddress(formData.address);
    if (!addressValidation.isValid) {
      newErrors.address = addressValidation.error || 'Invalid address';
    }

    // CNIC validation (optional)
    const cnicValidation = validateCNIC(formData.cnic);
    if (!cnicValidation.isValid) {
      newErrors.cnic = cnicValidation.error || 'Invalid CNIC';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (customer) {
        // Update customer
        await db.updateCustomer(customer.id, formData);

        // Log activity

        toast.success('Customer updated successfully');
      } else {
        // Create customer
        await db.createCustomer(formData);

        // Log activity


        toast.success('Customer created successfully');
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off" noValidate>
        {/* Multiple anti-autofill measures */}
        <div style={{ display: 'none' }}>
          <input type="text" name="fakeusernameremembered" autoComplete="username" />
          <input type="password" name="fakepasswordremembered" autoComplete="current-password" />
          <input type="text" name="fake_name" autoComplete="name" />
          <input type="text" name="fake_address" autoComplete="address-line1" />
          <input type="tel" name="fake_phone" autoComplete="tel" />
        </div>

        {/* Customer Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="customer-name">
            Customer Name <span className="text-red-500">*</span>
          </label>
          <input
            id={`customer-name-${Date.now()}`}
            type="text"
            name={fieldNames.name}
            value={formData.name}
            onChange={handleChange}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors${errors.name ? ' border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
            placeholder="e.g., Ali Khan"
            required
            disabled={loading}
            autoFocus
            aria-invalid={!!errors.name}
            maxLength={100}
            minLength={2}
            autoComplete="nope"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-form-type="other"
            data-lpignore="true"
            data-1p-ignore="true"
            data-dashlane-rid=""
            data-bwignore="true"
            role="textbox"
            readOnly
            onFocus={(e) => e.target.removeAttribute('readonly')}
          />
          {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
        </div>

        {/* Phone Number */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="customer-phone">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            id={`customer-phone-${Date.now()}`}
            type="text"
            name={fieldNames.phone}
            value={formData.phone}
            onChange={handleChange}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors${errors.phone ? ' border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
            required
            disabled={loading}
            placeholder="e.g., +92 300 1234567"
            aria-invalid={!!errors.phone}
            maxLength={20}
            minLength={10}
            autoComplete="nope"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-form-type="other"
            data-lpignore="true"
            data-1p-ignore="true"
            data-dashlane-rid=""
            data-bwignore="true"
            role="textbox"
            readOnly
            onFocus={(e) => e.target.removeAttribute('readonly')}
          />
          {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone}</p>}
        </div>

        {/* Optional Fields: Address and CNIC (Consistent Collapsible Card) */}
        <div>
          <button
            type="button"
            className="flex items-center w-full justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            onClick={() => setShowOptional((v) => !v)}
            aria-expanded={showOptional}
            disabled={loading}
          >
            <span className="tracking-wide">Optional Details</span>
            <svg
              className={`h-5 w-5 ml-2 transition-transform duration-200 ${showOptional ? 'rotate-90' : 'rotate-0'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div
            className={`overflow-hidden transition-all duration-300 bg-white border-x border-b border-gray-200 rounded-b-lg ${showOptional ? 'max-h-[500px] p-4 opacity-100' : 'max-h-0 p-0 opacity-0'}`}
            style={{ pointerEvents: showOptional ? 'auto' : 'none' }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="customer-address">
                  Address
                </label>
                <input
                  id={`customer-address-${Date.now()}`}
                  type="text"
                  name={fieldNames.address}
                  value={formData.address}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors${errors.address ? ' border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  disabled={loading}
                  placeholder="e.g., Street, City, Area"
                  maxLength={200}
                  autoComplete="nope"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  data-form-type="other"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-dashlane-rid=""
                  data-bwignore="true"
                  aria-invalid={!!errors.address}
                  role="textbox"
                  readOnly
                  onFocus={(e) => e.target.removeAttribute('readonly')}
                />
                {errors.address && <p className="text-red-600 text-sm mt-1">{errors.address}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="customer-cnic">
                  CNIC
                </label>
                <input
                  id={`customer-cnic-${Date.now()}`}
                  type="text"
                  name={fieldNames.cnic}
                  value={formData.cnic}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors${errors.cnic ? ' border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  disabled={loading}
                  placeholder="e.g., 12345-1234567-1"
                  maxLength={20}
                  pattern="\d{5}-\d{7}-\d{1}"
                  autoComplete="nope"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  data-form-type="other"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-dashlane-rid=""
                  data-bwignore="true"
                  aria-invalid={!!errors.cnic}
                  role="textbox"
                  readOnly
                  onFocus={(e) => e.target.removeAttribute('readonly')}
                />
                {errors.cnic && <p className="text-red-600 text-sm mt-1">{errors.cnic}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-8">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (customer ? 'Updating...' : 'Creating...') : (customer ? 'Update Customer' : 'Create Customer')}
          </button>
        </div>
      </form>
    </div>
  );
}