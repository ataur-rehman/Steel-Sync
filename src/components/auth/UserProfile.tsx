import React, { useState } from 'react';
import { 
  User, 
  Key, 
  Shield, 
  Edit, 
  Save, 
  X, 
  Calendar,
  Phone,
  Building,
  Clock
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useRoleAccess } from '../../hooks/useRoleAccess';
import PasswordChangeForm from './PasswordChangeForm';
import toast from 'react-hot-toast';
import { db } from '../../services/database';

const UserProfile: React.FC = () => {
  const { user } = useAuth();
  const { permissions } = useRoleAccess();
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    loadUserInfo();
  }, [user?.id]);

  const loadUserInfo = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const result = await db.executeCommand(`
        SELECT * FROM staff WHERE id = ?
      `, [user.id]);

      if (result && result.length > 0) {
        setUserInfo(result[0]);
      }
    } catch (error) {
      console.error('Error loading user info:', error);
      toast.error('Failed to load user information');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (updatedData: any) => {
    try {
      await db.executeCommand(`
        UPDATE staff 
        SET full_name = ?, phone = ?, address = ?, emergency_contact = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        updatedData.full_name,
        updatedData.phone,
        updatedData.address,
        updatedData.emergency_contact,
        user?.id
      ]);

      setUserInfo(updatedData);
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (showPasswordChange) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="mb-6">
            <button
              onClick={() => setShowPasswordChange(false)}
              className="flex items-center text-blue-600 hover:text-blue-700"
            >
              <X className="h-4 w-4 mr-1" />
              Back to Profile
            </button>
          </div>
          <PasswordChangeForm
            userId={user?.id}
            username={user?.username}
            onSuccess={() => setShowPasswordChange(false)}
            onCancel={() => setShowPasswordChange(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                <User className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {userInfo?.full_name || 'User Profile'}
                </h1>
                <p className="text-gray-600">
                  {user?.role && (
                    <span className="capitalize font-medium">{user.role}</span>
                  )}
                  {userInfo?.employee_id && (
                    <span className="ml-2 text-gray-400">• ID: {userInfo.employee_id}</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowPasswordChange(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Key className="h-4 w-4 mr-2" />
                Change Password
              </button>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                <Edit className="h-4 w-4 mr-2" />
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Information */}
          <div className="lg:col-span-2">
            <ProfileInformationCard 
              userInfo={userInfo}
              isEditing={isEditing}
              onSave={handleUpdateProfile}
              onCancel={() => setIsEditing(false)}
            />
          </div>

          {/* Account Details & Security */}
          <div className="space-y-6">
            <AccountDetailsCard userInfo={userInfo} />
            <SecurityCard permissions={permissions} />
          </div>
        </div>
      </div>
    </div>
  );
};

// Profile Information Card Component
const ProfileInformationCard: React.FC<{
  userInfo: any;
  isEditing: boolean;
  onSave: (data: any) => void;
  onCancel: () => void;
}> = ({ userInfo, isEditing, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    full_name: userInfo?.full_name || '',
    phone: userInfo?.phone || '',
    address: userInfo?.address || '',
    emergency_contact: userInfo?.emergency_contact || ''
  });

  React.useEffect(() => {
    setFormData({
      full_name: userInfo?.full_name || '',
      phone: userInfo?.phone || '',
      address: userInfo?.address || '',
      emergency_contact: userInfo?.emergency_contact || ''
    });
  }, [userInfo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
        <p className="text-sm text-gray-600">Update your personal information</p>
      </div>

      <div className="p-6">
        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Emergency Contact
              </label>
              <input
                type="text"
                value={formData.emergency_contact}
                onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <InfoField icon={User} label="Full Name" value={userInfo?.full_name} />
            <InfoField icon={Phone} label="Phone" value={userInfo?.phone || 'Not provided'} />
            <InfoField icon={Building} label="Address" value={userInfo?.address || 'Not provided'} />
            <InfoField icon={Phone} label="Emergency Contact" value={userInfo?.emergency_contact || 'Not provided'} />
          </div>
        )}
      </div>
    </div>
  );
};

// Account Details Card Component
const AccountDetailsCard: React.FC<{ userInfo: any }> = ({ userInfo }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
    <div className="p-6 border-b border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900">Account Details</h2>
    </div>
    <div className="p-6 space-y-4">
      <InfoField icon={User} label="Employee ID" value={userInfo?.employee_id} />
      <InfoField icon={Shield} label="Role" value={userInfo?.role} />
      <InfoField icon={Calendar} label="Hire Date" value={userInfo?.hire_date} />
      <InfoField icon={Clock} label="Account Created" value={userInfo?.created_at} />
      <InfoField 
        icon={Clock} 
        label="Last Updated" 
        value={userInfo?.updated_at} 
      />
      <InfoField 
        icon={Clock} 
        label="Password Changed" 
        value={userInfo?.password_changed_at || 'Never'} 
      />
    </div>
  </div>
);

// Security Card Component
const SecurityCard: React.FC<{ permissions: any }> = ({ permissions }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
    <div className="p-6 border-b border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900">Security & Permissions</h2>
    </div>
    <div className="p-6">
      <div className="space-y-3">
        {Object.entries(permissions).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-sm text-gray-600 capitalize">
              {key.replace(/_/g, ' ')}
            </span>
            <span className={`px-2 py-1 rounded text-xs ${
              value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {value ? 'Allowed' : 'Denied'}
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Info Field Component
const InfoField: React.FC<{ 
  icon: React.ComponentType<any>; 
  label: string; 
  value: string | undefined; 
}> = ({ icon: Icon, label, value }) => (
  <div className="flex items-center">
    <Icon className="h-4 w-4 text-gray-400 mr-3 flex-shrink-0" />
    <div className="min-w-0 flex-1">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-sm font-medium text-gray-900 truncate">
        {value || 'Not provided'}
      </p>
    </div>
  </div>
);

export default UserProfile;
