import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import Button from '../components/Button';
import FormInput from '../components/FormInput';
import Modal from '../components/Modal';
import { useAuth } from '../hooks/useAuth';

interface GroupMember {
  userId: number;
  role: string;
  user: { id: number; name: string; email: string };
}

interface Plan {
  id: number;
  title: string;
  type: string;
  status: string;
}

interface GroupData {
  id: number;
  name: string;
  inviteCode: string;
  members: GroupMember[];
  plans: Plan[];
}

const GroupPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [planTitle, setPlanTitle] = useState('');
  const [planType, setPlanType] = useState('OTHER');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchGroup();
  }, [id]);

  const fetchGroup = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/groups/${id}`);
      setGroup(response.data);
    } catch (err) {
      setError('Failed to load group');
    } finally {
      setLoading(false);
    }
  };

  const isOwner = Boolean(
    user &&
      group?.members?.some((m) => m.role === 'OWNER' && m.userId === user.id)
  );

  const handleCreatePlan = async () => {
    if (!planTitle.trim()) {
      setError('Plan title is required');
      return;
    }
    try {
      await api.post('/plans', {
        groupId: parseInt(id!),
        title: planTitle,
        type: planType,
      });
      setPlanTitle('');
      setPlanType('OTHER');
      setCreateModalOpen(false);
      setError('');
      fetchGroup();
    } catch (err) {
      setError('Failed to create plan');
    }
  }; 

  const handleDeleteGroup = async () => {
    if (!window.confirm('Delete this group? This will remove all plans and expenses.')) return;
    try {
      await api.delete(`/groups/${id}`);
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to delete group');
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <p className="text-gray-400">Loading group...</p>
        </div>
      </>
    );
  }

  if (!group) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <p className="text-gray-400">Group not found</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">{group.name}</h1>
              <p className="text-gray-400">Invite code: <code className="bg-gray-700 px-2 py-1 rounded">{group.inviteCode}</code></p>
            </div>
            <div className="flex items-center gap-2">
              {isOwner && (
                <Button variant="danger" onClick={handleDeleteGroup}>
                  Delete Group
                </Button>
              )}
              <Button variant="secondary" onClick={() => navigate('/dashboard')}>
                Back to Groups
              </Button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-900 bg-opacity-50 border border-red-500 rounded-lg text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Members Section */}
            <Card>
              <h2 className="text-2xl font-bold text-white mb-4">Members</h2>
              <div className="space-y-2">
                {group.members.map((member) => (
                  <div key={member.userId} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-0">
                    <div>
                      <p className="text-white font-medium">{member.user.name}</p>
                      <p className="text-gray-500 text-sm">{member.user.email}</p>
                    </div>
                    <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Plans Section */}
            <div className="lg:col-span-2">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">Plans</h2>
                <Button
                  variant="primary"
                  onClick={() => setCreateModalOpen(true)}
                >
                  + Create Plan
                </Button>
              </div>

              <div className="space-y-4">
                {group.plans.length === 0 ? (
                  <Card>
                    <p className="text-gray-400 text-center py-8">No plans yet. Create one to get started!</p>
                  </Card>
                ) : (
                  group.plans.map((plan) => (
                    <Card
                      key={plan.id}
                      className="cursor-pointer hover:border-blue-500"
                      hoverable
                      onClick={() => navigate(`/plans/${plan.id}`)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-bold text-white mb-2">{plan.title}</h3>
                          <div className="flex gap-2">
                            <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                              {plan.type}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              plan.status === 'VOTING' ? 'bg-yellow-900 text-yellow-300' :
                              plan.status === 'FINALIZED' ? 'bg-green-900 text-green-300' :
                              'bg-gray-700 text-gray-300'
                            }`}>
                              {plan.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Plan Modal */}
      <Modal
        isOpen={createModalOpen}
        title="Create New Plan"
        onClose={() => {
          setCreateModalOpen(false);
          setPlanTitle('');
          setPlanType('OTHER');
          setError('');
        }}
      >
        <FormInput
          label="Plan Title"
          name="planTitle"
          value={planTitle}
          onChange={(e) => setPlanTitle(e.target.value)}
          placeholder="Movie Night"
          required
        />
        <div className="mb-4">
          <label htmlFor="planType" className="block text-sm font-medium text-gray-300 mb-2">
            Activity Type
          </label>
          <select
            id="planType"
            value={planType}
            onChange={(e) => setPlanType(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="MOVIE">Movie</option>
            <option value="CAFE">Cafe</option>
            <option value="NUKAD">Nukad</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div className="flex gap-2 mt-6">
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleCreatePlan}
          >
            Create
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => {
              setCreateModalOpen(false);
              setPlanTitle('');
              setPlanType('OTHER');
              setError('');
            }}
          >
            Cancel
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default GroupPage;