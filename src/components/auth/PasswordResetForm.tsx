import React, { useState } from 'react';
import { 
  Mail, 
  Key, 
  Shield, 
  ArrowLeft, 
  CheckCircle, 
  AlertTriangle,
  Send
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../../services/auth';
import { db } from '../../services/database';
import { auditLogService } from '../../services/auditLogService';

interface PasswordResetFormProps {
  onBack?: () => void;
}

const PasswordResetForm: React.FC<PasswordResetFormProps> = ({ onBack }) => {
  const [step, setStep] = useState<'request' | 'verify' | 'reset' | 'complete'>('request');
  const [formData, setFormData] = useState({
    username: '',
    employeeId: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [userFound, setUserFound] = useState<any>(null);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username && !formData.employeeId) {
      toast.error('Please enter either username or employee ID');
      return;
    }

    setIsLoading(true);

    try {
      // Find user by username or employee ID
      const query = formData.username 
        ? `SELECT * FROM staff WHERE username = ? AND is_active = 1`
        : `SELECT * FROM staff WHERE employee_id = ? AND is_active = 1`;
      
      const param = formData.username || formData.employeeId;
      const users = await db.executeCommand(query, [param]);

      if (!users || users.length === 0) {
        toast.error('User not found or account is inactive');
        return;
      }

      const user = users[0];
      setUserFound(user);

      // Generate reset token (in real app, this would be sent via email/SMS)
      const token = authService.generateSessionToken();
      setResetToken(token);

      // Store reset token in database with expiry (1 hour)
      const expiryTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      
      await db.executeCommand(`
        INSERT OR REPLACE INTO password_reset_tokens 
        (user_id, token, expires_at, created_at, used) 
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, 0)
      `, [user.id, token, expiryTime]);

      // Log the reset request
      await auditLogService.logEvent({
        user_id: user.id,
        user_name: user.username || 'system',
        action: 'CREATE',
        entity_type: 'SYSTEM',
        entity_id: `password_reset_${user.id}`,
        description: `Password reset requested for user: ${user.username}`,
        new_values: {
          reset_method: formData.username ? 'username' : 'employee_id',
          requested_at: new Date().toISOString()
        }
      });

      setStep('verify');
      toast.success('Reset request created. Contact your administrator for the reset token.');
    } catch (error) {
      console.error('Password reset request error:', error);
      toast.error('Failed to process reset request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyToken = () => {
    if (!resetToken) {
      toast.error('Please enter the reset token');
      return;
    }
    setStep('reset');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.newPassword || !formData.confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      // Verify token is still valid
      const tokenCheck = await db.executeCommand(`
        SELECT * FROM password_reset_tokens 
        WHERE token = ? AND user_id = ? AND used = 0 AND expires_at > CURRENT_TIMESTAMP
      `, [resetToken, userFound.id]);

      if (!tokenCheck || tokenCheck.length === 0) {
        toast.error('Invalid or expired reset token');
        return;
      }

      // Hash new password
      const hashedPassword = await authService.hashPassword(formData.newPassword);

      // Update password
      await db.executeCommand(`
        UPDATE staff 
        SET password_hash = ?, password_changed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [hashedPassword, userFound.id]);

      // Mark token as used
      await db.executeCommand(`
        UPDATE password_reset_tokens 
        SET used = 1, used_at = CURRENT_TIMESTAMP 
        WHERE token = ?
      `, [resetToken]);

      // Log the password reset
      await auditLogService.logEvent({
        user_id: userFound.id,
        user_name: userFound.username || 'system',
        action: 'UPDATE',
        entity_type: 'STAFF',
        entity_id: userFound.id,
        description: `Password reset completed for user: ${userFound.username}`,
        new_values: {
          password_reset: true,
          reset_completed_at: new Date().toISOString()
        }
      });

      setStep('complete');
      toast.success('Password reset successfully!');
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error('Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  const initializeResetTable = async () => {
    try {
      await db.executeCommand(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          token TEXT NOT NULL UNIQUE,
          expires_at TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          used INTEGER DEFAULT 0,
          used_at TEXT,
          FOREIGN KEY (user_id) REFERENCES staff (id)
        )
      `);
    } catch (error) {
      console.error('Failed to initialize reset table:', error);
    }
  };

  React.useEffect(() => {
    initializeResetTable();
  }, []);

  const renderRequestStep = () => (
    <div>
      <div className="text-center mb-6">
        <div className="mx-auto h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
          <Key className="h-6 w-6 text-blue-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Reset Password</h2>
        <p className="text-sm text-gray-600 mt-2">
          Enter your username or employee ID to request a password reset
        </p>
      </div>

      <form onSubmit={handleRequestReset} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Username
          </label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your username"
          />
        </div>

        <div className="text-center text-sm text-gray-500">
          OR
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Employee ID
          </label>
          <input
            type="text"
            value={formData.employeeId}
            onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your employee ID"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || (!formData.username && !formData.employeeId)}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Request Reset
            </>
          )}
        </button>
      </form>
    </div>
  );

  const renderVerifyStep = () => (
    <div>
      <div className="text-center mb-6">
        <div className="mx-auto h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
          <Mail className="h-6 w-6 text-yellow-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Reset Token Required</h2>
        <p className="text-sm text-gray-600 mt-2">
          Contact your administrator to get the reset token for:
        </p>
        <p className="text-sm font-medium text-gray-900 mt-1">
          {userFound?.username} ({userFound?.employee_id})
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reset Token
          </label>
          <input
            type="text"
            value={resetToken}
            onChange={(e) => setResetToken(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter the token provided by your administrator"
          />
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-start">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-xs text-yellow-800">
              <p className="font-medium mb-1">Important:</p>
              <p>The reset token is only valid for 1 hour and can only be used once. Contact your system administrator if you need assistance.</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleVerifyToken}
          disabled={!resetToken}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Verify Token
        </button>
      </div>
    </div>
  );

  const renderResetStep = () => (
    <div>
      <div className="text-center mb-6">
        <div className="mx-auto h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
          <Shield className="h-6 w-6 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Set New Password</h2>
        <p className="text-sm text-gray-600 mt-2">
          Enter your new password for: {userFound?.username}
        </p>
      </div>

      <form onSubmit={handleResetPassword} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            New Password
          </label>
          <input
            type="password"
            value={formData.newPassword}
            onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter new password"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirm New Password
          </label>
          <input
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Confirm new password"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !formData.newPassword || !formData.confirmPassword}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Resetting...
            </>
          ) : (
            <>
              <Key className="h-4 w-4 mr-2" />
              Reset Password
            </>
          )}
        </button>
      </form>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="text-center">
      <div className="mx-auto h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
        <CheckCircle className="h-6 w-6 text-green-600" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Password Reset Complete</h2>
      <p className="text-sm text-gray-600 mb-6">
        Your password has been successfully reset. You can now log in with your new password.
      </p>
      <button
        onClick={onBack}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Back to Login
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg border border-gray-200 p-6">
        {onBack && step !== 'complete' && (
          <button
            onClick={onBack}
            className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Login
          </button>
        )}

        {step === 'request' && renderRequestStep()}
        {step === 'verify' && renderVerifyStep()}
        {step === 'reset' && renderResetStep()}
        {step === 'complete' && renderCompleteStep()}
      </div>
    </div>
  );
};

export default PasswordResetForm;
