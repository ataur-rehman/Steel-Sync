import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BackButtonProps {
  to?: string;
  onClick?: () => void;
  label?: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'text' | 'minimal';
}

export default function BackButton({ 
  to, 
  onClick, 
  label = 'Back', 
  className = '',
  variant = 'secondary'
}: BackButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'btn btn-primary flex items-center px-4 py-2 text-sm';
      case 'secondary':
        return 'btn btn-secondary flex items-center px-4 py-2 text-sm';
      case 'text':
        return 'flex items-center text-gray-600 hover:text-gray-900 transition-colors px-2 py-1';
      case 'minimal':
        return 'flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm';
      default:
        return 'btn btn-secondary flex items-center px-4 py-2 text-sm';
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`${getVariantClasses()} ${className}`}
      title={label}
    >
      <ArrowLeft className="h-4 w-4 mr-2" />
      {variant !== 'minimal' && label}
    </button>
  );
}
