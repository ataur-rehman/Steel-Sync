import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  let sizeClass = '';
  switch (size) {
    case 'sm':
      sizeClass = 'max-w-sm';
      break;
    case 'md':
      sizeClass = 'max-w-md';
      break;
    case 'lg':
      sizeClass = 'max-w-lg';
      break;
    case 'xl':
      sizeClass = 'max-w-xl';
      break;
    case 'xxl':
      sizeClass = 'max-w-4xl';
      break;
    default:
      sizeClass = 'max-w-md';
  }

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className={`card w-full ${sizeClass} relative p-0 mx-4`}>
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-blue-600 text-2xl font-light focus:outline-none z-10"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <div className="px-6 pt-6 pb-3 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        </div>
        <div className="px-6 pb-6 pt-2">{children}</div>
      </div>
    </div>
  );

  // Use portal to render modal at body level
  return createPortal(modalContent, document.body);
}