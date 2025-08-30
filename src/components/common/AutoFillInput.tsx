import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface AutoFillOption {
    id: string | number;
    label: string;
    value: string;
    secondary?: string; // Secondary info like phone, address, etc.
}

interface AutoFillInputProps {
    value: string;
    onChange: (value: string) => void;
    onSelect?: (option: AutoFillOption) => void;
    options: AutoFillOption[];
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    loading?: boolean;
    showDropdownIcon?: boolean;
    filterMinLength?: number;
    maxResults?: number;
    noResultsText?: string;
    label?: string;
    required?: boolean;
    error?: string;
}

export default function AutoFillInput({
    value,
    onChange,
    onSelect,
    options = [],
    placeholder = "Start typing to search...",
    className = "",
    disabled = false,
    loading = false,
    showDropdownIcon = true,
    filterMinLength = 1,
    maxResults = 10,
    noResultsText = "No results found",
    label,
    required = false,
    error
}: AutoFillInputProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Filter options based on search value
    const filteredOptions = React.useMemo(() => {
        if (value.length < filterMinLength) return [];

        const searchTerm = value.toLowerCase();
        return options
            .filter(option =>
                option.label.toLowerCase().includes(searchTerm) ||
                option.value.toLowerCase().includes(searchTerm) ||
                (option.secondary && option.secondary.toLowerCase().includes(searchTerm))
            )
            .slice(0, maxResults);
    }, [value, options, filterMinLength, maxResults]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setFocusedIndex(-1);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        onChange(newValue);
        setIsOpen(true);
        setFocusedIndex(-1);
    };

    const handleInputFocus = () => {
        setIsOpen(true);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === 'Enter' || e.key === 'ArrowDown') {
                setIsOpen(true);
                e.preventDefault();
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setFocusedIndex(prev =>
                    prev < filteredOptions.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setFocusedIndex(prev => prev > 0 ? prev - 1 : -1);
                break;
            case 'Enter':
                e.preventDefault();
                if (focusedIndex >= 0 && filteredOptions[focusedIndex]) {
                    handleSelectOption(filteredOptions[focusedIndex]);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setFocusedIndex(-1);
                inputRef.current?.blur();
                break;
            case 'Tab':
                setIsOpen(false);
                setFocusedIndex(-1);
                break;
        }
    };

    const handleSelectOption = (option: AutoFillOption) => {
        onChange(option.label);
        if (onSelect) {
            onSelect(option);
        }
        setIsOpen(false);
        setFocusedIndex(-1);
        inputRef.current?.focus();
    };

    const shouldShowDropdown = isOpen && !loading && (
        filteredOptions.length > 0 ||
        (value.length >= filterMinLength && filteredOptions.length === 0)
    );

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}

            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`
            w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm
            ${showDropdownIcon ? 'pr-10' : 'pr-3'}
            ${error ? 'border-red-500' : 'border-gray-300'}
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
          `}
                    style={{
                        fontSize: '16px', // Prevent zoom on mobile
                        overflowX: 'hidden' // Prevent horizontal scroll
                    }} autoComplete="off"
                />

                {showDropdownIcon && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        {loading ? (
                            <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
                        ) : (
                            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        )}
                    </div>
                )}
            </div>

            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}

            {shouldShowDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option, index) => (
                            <div
                                key={option.id}
                                className={`
                  px-3 py-2 cursor-pointer border-b border-gray-100 last:border-b-0
                  ${index === focusedIndex ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}
                `}
                                onClick={() => handleSelectOption(option)}
                                onMouseEnter={() => setFocusedIndex(index)}
                            >
                                <div className="flex flex-col">
                                    <span className="font-medium">{option.label}</span>
                                    {option.secondary && (
                                        <span className="text-xs text-gray-500">{option.secondary}</span>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="px-3 py-2 text-sm text-gray-500 text-center">
                            {noResultsText}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
