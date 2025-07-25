import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DetailHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  showBackButton?: boolean;
}

export default function DetailHeader({ 
  title, 
  subtitle, 
  onBack, 
  actions, 
  showBackButton = true 
}: DetailHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      // Smart back navigation - check if there's history
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        // Fallback to a sensible default (e.g., go to customers list)
        navigate('/customers');
      }
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {showBackButton && (
            <button
              onClick={handleBack}
              className="flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
              title="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h1>
            {subtitle && (
              <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center space-x-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
