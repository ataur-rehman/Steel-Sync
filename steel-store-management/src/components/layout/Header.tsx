import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { LogOut, User } from 'lucide-react';

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-6 py-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">
          Welcome back, {user?.username}
        </h2>
        <div className="flex items-center space-x-4">
          <span className="flex items-center text-sm text-gray-600">
            <User className="w-4 h-4 mr-1" />
            {user?.username}
          </span>
          <button
            onClick={logout}
            className="flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <LogOut className="w-4 h-4 mr-1" />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}