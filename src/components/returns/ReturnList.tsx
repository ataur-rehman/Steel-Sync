import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from '../../hooks/useDatabase';
import type { Return } from '../../types';
import { toast } from 'react-hot-toast';
import { Plus } from 'lucide-react';
import DataTable from '../common/DataTable';
import { formatCurrency } from '../../utils/calculations';

export default function ReturnList() {
  const navigate = useNavigate();
  const { db } = useDatabase();
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReturns();
  }, []);

  const loadReturns = async () => {
    try {
      const data = await db.getReturns();
      setReturns(data);
    } catch (error) {
      toast.error('Failed to load returns');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { 
      key: 'created_at', 
      label: 'Date',
      render: (value: string) => new Date(value).toLocaleDateString()
    },
    { key: 'bill_number', label: 'Invoice' },
    { key: 'product_name', label: 'Product' },
    { 
      key: 'quantity', 
      label: 'Quantity',
      render: (value: number, row: any) => `${value} ${row.unit}`
    },
    { 
      key: 'rate', 
      label: 'Rate',
      render: (value: number) => formatCurrency(value)
    },
    { 
      key: 'total', 
      label: 'Total',
      render: (value: number) => formatCurrency(value)
    },
    { key: 'reason', label: 'Reason' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Returns</h1>
        <button
          onClick={() => navigate('/returns/new')}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Process Return
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <DataTable
          columns={columns}
          data={returns}
          emptyMessage="No returns found"
        />
      </div>
    </div>
  );
}