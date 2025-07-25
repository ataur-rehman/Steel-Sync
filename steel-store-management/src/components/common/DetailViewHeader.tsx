import { ArrowLeft, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DetailViewHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onClose?: () => void;
  showBackButton?: boolean;
  showCloseButton?: boolean;
  actions?: React.ReactNode;
  className?: string;
}

export default function DetailViewHeader({
  title,
  subtitle,
  onBack,
  onClose,
  showBackButton = true,
  showCloseButton = false,
  actions,
  className = ''
}: DetailViewHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      // Smart back navigation
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        // Fallback to a sensible default
        navigate('/dashboard');
      }
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      handleBack();
    }
  };

  return (
    <div className={`bg-white border-b border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center space-x-4">
            {/* Back Button */}
            {showBackButton && (
              <button
                onClick={handleBack}
                className="flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                title="Go back"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
            )}

            {/* Close Button (for modals/cards) */}
            {showCloseButton && (
              <button
                onClick={handleClose}
                className="flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                title="Close"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            )}

            {/* Title and Subtitle */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              {subtitle && (
                <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          {actions && (
            <div className="flex items-center space-x-3">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
