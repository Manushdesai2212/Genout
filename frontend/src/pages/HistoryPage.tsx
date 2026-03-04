import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import Card from '../components/Card';

interface PlanSummary {
  id: number;
  title: number | string;
  status: string;
  createdAt: string;
  totalExpense: number;
}

const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/plans/history');
      setPlans(res.data);
    } catch (err) {
      setError('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-6">Past Plans & Insights</h1>

          {error && (
            <div className="mb-4 p-3 bg-red-900 bg-opacity-50 border border-red-500 rounded text-red-300">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-gray-400">Loading...</p>
          ) : (
            <div className="space-y-4">
              {plans.length === 0 ? (
                <p className="text-gray-400 text-center">No historical plans yet.</p>
              ) : (
                plans.map((p) => (
                  <Card key={p.id} className="cursor-pointer hover:border-blue-500" hoverable onClick={() => navigate(`/plans/${p.id}`)}>
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="text-xl font-bold text-white">{p.title}</h2>
                        <p className="text-gray-400 text-sm">{new Date(p.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-300">Status: {p.status}</p>
                        <p className="text-blue-400 font-semibold">₹{p.totalExpense.toFixed(2)}</p>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default HistoryPage;