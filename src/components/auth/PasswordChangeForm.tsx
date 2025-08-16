import React, { useState } from 'react';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  Shield, 
  CheckCircle, 
  AlertTriangle,
  Key
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/auth';
import { db } from '../../services/database';
import { auditLogService } from '../../services/auditLogService';

interface PasswordChangeFormProps {
  userId?: string;
  username?: string;
  isAdminReset?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const PasswordChangeForm: React.FC<PasswordChangeFormProps> = ({
  userId,
  username,
  isAdminReset = false,
  onSuccess,
  onCancel
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Password strength validation
  const calculatePasswordStrength = (password: string): number => {
    let strength = 0;
    
    if (password.length >= 8) strength += 25;
    if (password.match(/[a-z]/)) strength += 25;
    if (password.match(/[A-Z]/)) strength += 25;
    if (password.match(/[0-9]/)) strength += 15;
    if (password.match(/[^a-zA-Z0-9]/)) strength += 10;
    
    return Math.min(strength, 100);
  };

  const handlePasswordChange = (value: string) => {
    setFormData(prev => ({ ...prev, newPassword: value }));
    setPasswordStrength(calculatePasswordStrength(value));
  };

  const getStrengthColor = (strength: number): string => {
    if (strength < 30) return 'bg-red-500';
    if (strength < 60) return 'bg-yellow-500';
    if (strength < 80) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStrengthText = (strength: number): string => {
    if (strength < 30) return 'Weak';
    if (strength < 60) return 'Fair';
    if (strength < 80) return 'Good';
    return 'Strong';
  };

  const validateForm = (): string | null => {
    if (!isAdminReset && !formData.currentPassword) {
      return 'Current password is required';
    }

    if (!formData.newPassword) {
      return 'New password is required';
    }

    if (formData.newPassword.length < 8) {
      return 'Password must be at least 8 characters long';
    }

    if (formData.newPassword !== formData.confirmPassword) {
      return 'New passwords do not match';
    }

    if (!isAdminReset && formData.currentPassword === formData.newPassword) {
      return 'New password must be different from current password';
    }

    if (passwordStrength < 50) {
      return 'Password is too weak. Please use a stronger password.';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }

    setIsLoading(true);

    try {
      const targetUserId = userId || user?.id;
      const targetUsername = username || user?.username;

      if (!targetUserId) {
        throw new Error('User ID not found');
      }

      // For non-admin changes, verify current password
      if (!isAdminReset) {
        // Check current password (simplified - in real implementation would query DB)
        // This would need to be implemented based on your current auth system
      }

      // Hash the new password
      const hashedPassword = await authService.hashPassword(formData.newPassword);

      // Update password in database
      await db.executeCommand(`
        UPDATE staff 
        SET password_hash = ?, password_changed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [hashedPassword, targetUserId]);

      // Log the password change
      await auditLogService.logEvent({
        user_id: parseInt(user?.id || '1'),
        user_name: user?.username || 'system',
        action: 'UPDATE',
        entity_type: 'STAFF',
        entity_id: targetUserId,
        description: isAdminReset 
          ? `Admin reset password for user: ${targetUsername}`
          : 'User changed their password',
        new_values: {
          password_changed: true,
          changed_by: isAdminReset ? 'admin' : 'self'
        }
      });

      toast.success(
        isAdminReset 
          ? 'Password reset successfully' 
          : 'Password changed successfully'
      );

      // Clear form
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      onSuccess?.();
    } catch (error) {
      console.error('Password change error:', error);
      toast.error('Failed to change password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg border border-gray-200">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center mb-6">
          <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
            <Lock className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isAdminReset ? 'Reset Password' : 'Change Password'}
            </h2>
            <p className="text-sm text-gray-500">
              {isAdminReset 
                ? `Reset password for ${username}` 
                : 'Update your account password'
              }
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password (only for self-change) */}
          {!isAdminReset && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={formData.currentPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={(e) => handlePasswordChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {formData.newPassword && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>Password Strength</span>
                  <span className={`font-medium ${
                    passwordStrength < 30 ? 'text-red-600' :
                    passwordStrength < 60 ? 'text-yellow-600' :
                    passwordStrength < 80 ? 'text-blue-600' : 'text-green-600'
                  }`}>
                    {getStrengthText(passwordStrength)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(passwordStrength)}`}
                    style={{ width: `${passwordStrength}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Password Match Indicator */}
            {formData.confirmPassword && (
              <div className="mt-1 flex items-center text-xs">
                {formData.newPassword === formData.confirmPassword ? (
                  <>
                    <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                    <span className="text-green-600">Passwords match</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3 w-3 text-red-500 mr-1" />
                    <span className="text-red-600">Passwords do not match</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Password Requirements */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center text-xs text-gray-600 mb-2">
              <Shield className="h-3 w-3 mr-1" />
              <span className="font-medium">Password Requirements:</span>
            </div>
            <ul className="text-xs text-gray-600 space-y-1">
              <li className="flex items-center">
                <div className={`h-1 w-1 rounded-full mr-2 ${formData.newPassword.length >= 8 ? 'bg-green-500' : 'bg-gray-300'}`} />
                At least 8 characters long
              </li>
              <li className="flex items-center">
                <div className={`h-1 w-1 rounded-full mr-2 ${formData.newPassword.match(/[A-Z]/) ? 'bg-green-500' : 'bg-gray-300'}`} />
                Contains uppercase letter
              </li>
              <li className="flex items-center">
                <div className={`h-1 w-1 rounded-full mr-2 ${formData.newPassword.match(/[a-z]/) ? 'bg-green-500' : 'bg-gray-300'}`} />
                Contains lowercase letter
              </li>
              <li className="flex items-center">
                <div className={`h-1 w-1 rounded-full mr-2 ${formData.newPassword.match(/[0-9]/) ? 'bg-green-500' : 'bg-gray-300'}`} />
                Contains number
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading || passwordStrength < 50}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isAdminReset ? 'Resetting...' : 'Changing...'}
                </>
              ) : (
                <>
                  <Key className="h-4 w-4 mr-2" />
                  {isAdminReset ? 'Reset Password' : 'Change Password'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordChangeForm;
