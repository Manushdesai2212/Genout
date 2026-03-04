import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import Button from '../components/Button';
import FormInput from '../components/FormInput';
import Modal from '../components/Modal';

interface Group {
  id: number;
  name: string;
  inviteCode: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await api.get('/groups');
      setGroups(response.data);
    } catch (err) {
      setError('Failed to fetch groups');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      setError('Group name is required');
      return;
    }
    try {
      await api.post('/groups/create', { name: newGroupName });
      setNewGroupName('');
      setCreateModalOpen(false);
      setError('');
      fetchGroups();
    } catch (err) {
      setError('Failed to create group');
    }
  };

  const handleJoinGroup = async () => {
    if (!inviteCode.trim()) {
      setError('Invite code is required');
      return;
    }
    try {
      await api.post('/groups/join', { code: inviteCode });
      setInviteCode('');
      setJoinModalOpen(false);
      setError('');
      fetchGroups();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to join group');
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Your Groups</h1>
            <p className="text-gray-400">Manage your hangout groups and plans</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mb-8">
            <Button
              variant="primary"
              onClick={() => setCreateModalOpen(true)}
            >
              + Create Group
            </Button>
            <Button
              variant="secondary"
              onClick={() => setJoinModalOpen(true)}
            >
              Join Group
            </Button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-900 bg-opacity-50 border border-red-500 rounded-lg text-red-300">
              {error}
            </div>
          )}

          {/* Groups Grid */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-400">Loading groups...</p>
            </div>
          ) : groups.length === 0 ? (
            <Card className="text-center py-12">
              <p className="text-gray-400 mb-4">No groups yet</p>
              <p className="text-gray-500 text-sm">Create a new group or join an existing one to get started</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groups.map((group) => (
                <Card
                  key={group.id}
                  className="cursor-pointer hover:border-blue-500"
                  hoverable
                >
                  <h3 className="text-xl font-bold text-white mb-2">{group.name}</h3>
                  <p className="text-gray-400 text-sm mb-4">Code: {group.inviteCode}</p>
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => navigate(`/groups/${group.id}`)}
                  >
                    View Group
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Group Modal */}
      <Modal
        isOpen={createModalOpen}
        title="Create New Group"
        onClose={() => {
          setCreateModalOpen(false);
          setNewGroupName('');
          setError('');
        }}
      >
        <FormInput
          label="Group Name"
          name="groupName"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder="Movie Night Friends"
          required
        />
        <div className="flex gap-2 mt-6">
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleCreateGroup}
          >
            Create
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => {
              setCreateModalOpen(false);
              setNewGroupName('');
              setError('');
            }}
          >
            Cancel
          </Button>
        </div>
      </Modal>

      {/* Join Group Modal */}
      <Modal
        isOpen={joinModalOpen}
        title="Join Group"
        onClose={() => {
          setJoinModalOpen(false);
          setInviteCode('');
          setError('');
        }}
      >
        <FormInput
          label="Invite Code"
          name="inviteCode"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          placeholder="e.g., INVITE123"
          required
        />
        <div className="flex gap-2 mt-6">
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleJoinGroup}
          >
            Join
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => {
              setJoinModalOpen(false);
              setInviteCode('');
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

export default Dashboard;