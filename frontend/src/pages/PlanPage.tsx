import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import Button from '../components/Button';
import FormInput from '../components/FormInput';
import Modal from '../components/Modal';
import { io as clientIo, Socket } from 'socket.io-client';

interface Poll {
  id: number;
  question: string;
  options: Array<{ id: number; text: string; votes: number }>;
}

interface Expense {
  id: number;
  amount: number;
  description: string;
  category: string;
  paidBy: { id: number; name: string };
}

interface Settlement {
  id: number;
  fromUser: { id: number; name: string };
  toUser: { id: number; name: string };
  amount: number;
}

interface PlanData {
  id: number;
  title: string;
  type: string;
  status: string;
  createdBy: { id: number; name: string };
  polls: Poll[];
  expenses: Expense[];
  settlements: Settlement[];
}

const PlanPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modals
  const [pollModalOpen, setPollModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  
  // Poll form
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  
  // Expense form
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('FOOD');

  useEffect(() => {
    fetchPlan();
  }, [id]);

  useEffect(() => {
    let socket: Socket;
    if (id) {
      socket = clientIo();
      socket.emit('join', `plan_${id}`);
      socket.on('vote', fetchPlan);
      socket.on('optionAdded', fetchPlan);
      socket.on('expenseAdded', fetchPlan);
    }
    return () => {
      socket?.disconnect();
    };
  }, [id]);

  const fetchPlan = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/plans/${id}`);
      setPlan(response.data);
    } catch (err) {
      setError('Failed to load plan');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePoll = async () => {
    if (!pollQuestion.trim()) {
      setError('Poll question is required');
      return;
    }
    const validOptions = pollOptions.filter((o) => o.trim());
    if (validOptions.length < 2) {
      setError('At least 2 poll options are required');
      return;
    }
    try {
      await api.post('/polls', {
        planId: parseInt(id!),
        question: pollQuestion,
        options: validOptions,
      });
      setPollQuestion('');
      setPollOptions(['', '']);
      setPollModalOpen(false);
      setError('');
      fetchPlan();
    } catch (err) {
      setError('Failed to create poll');
    }
  };

  const handleVote = async (pollId: number, optionId: number) => {
    try {
      await api.post(`/polls/${pollId}/vote`, { optionId });
      fetchPlan();
    } catch (err) {
      setError('Failed to vote');
    }
  };

  const handleAddExpense = async () => {
    if (!expenseAmount.trim() || !expenseDesc.trim()) {
      setError('Amount and description are required');
      return;
    }
    try {
      await api.post('/expenses', {
        planId: parseInt(id!),
        amount: parseFloat(expenseAmount),
        description: expenseDesc,
        category: expenseCategory,
      });
      setExpenseAmount('');
      setExpenseDesc('');
      setExpenseCategory('FOOD');
      setExpenseModalOpen(false);
      setError('');
      fetchPlan();
    } catch (err) {
      setError('Failed to add expense');
    }
  };

  const handleFinalizePlan = async () => {
    try {
      await api.post(`/plans/${id}/finalize`, {});
      fetchPlan();
    } catch (err) {
      setError('Failed to finalize plan');
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <p className="text-gray-400">Loading plan...</p>
        </div>
      </>
    );
  }

  if (!plan) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <p className="text-gray-400">Plan not found</p>
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
              <h1 className="text-4xl font-bold text-white mb-2">{plan.title}</h1>
              <div className="flex gap-3">
                <span className="text-sm bg-gray-700 text-gray-300 px-3 py-1 rounded">{plan.type}</span>
                <span className={`text-sm px-3 py-1 rounded ${
                  plan.status === 'VOTING' ? 'bg-yellow-900 text-yellow-300' :
                  plan.status === 'FINALIZED' ? 'bg-green-900 text-green-300' :
                  'bg-gray-700 text-gray-300'
                }`}>
                  {plan.status}
                </span>
              </div>
            </div>
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Back
            </Button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-900 bg-opacity-50 border border-red-500 rounded-lg text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Polls Section */}
            <div className="lg:col-span-2">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">Polls</h2>
                {plan.status === 'VOTING' && (
                  <Button variant="primary" onClick={() => setPollModalOpen(true)}>
                    + Add Poll
                  </Button>
                )}
              </div>
              <div className="space-y-4">
                {plan.polls.length === 0 ? (
                  <Card>
                    <p className="text-gray-400 text-center py-8">No polls yet</p>
                  </Card>
                ) : (
                  plan.polls.map((poll) => (
                    <Card key={poll.id}>
                      <h3 className="text-lg font-bold text-white mb-4">{poll.question}</h3>
                      <div className="space-y-3">
                        {poll.options.map((option) => (
                          <button
                            key={option.id}
                            onClick={() => handleVote(poll.id, option.id)}
                            className="w-full text-left p-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition border border-gray-600 hover:border-blue-500"
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-white">{option.text}</span>
                              <span className="text-sm text-gray-400">{option.votes} votes</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>

            {/* Expenses Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">Expenses</h2>
                {plan.status === 'VOTING' && (
                  <Button variant="primary" onClick={() => setExpenseModalOpen(true)}>
                    + Add
                  </Button>
                )}
              </div>
              <Card>
                <div className="space-y-3">
                  {plan.expenses.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">No expenses yet</p>
                  ) : (
                    plan.expenses.map((expense) => (
                      <div key={expense.id} className="p-3 rounded bg-gray-700 border border-gray-600">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-white font-medium text-sm">{expense.description}</span>
                          <span className="text-lg font-bold text-blue-400">₹{expense.amount.toFixed(2)}</span>
                        </div>
                        <div className="flex gap-2 text-xs">
                          <span className="text-gray-400">{expense.paidBy.name}</span>
                          <span className="text-gray-500">{expense.category}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </div>

          {/* Settlements Section */}
          {plan.status === 'FINALIZED' && plan.settlements.length > 0 && (
            <Card className="mt-6">
              <h2 className="text-2xl font-bold text-white mb-4">Settlements Needed</h2>
              <div className="space-y-3">
                {plan.settlements.map((settlement) => (
                  <div key={settlement.id} className="p-4 rounded-lg bg-gradient-to-r from-yellow-900 to-yellow-800 border border-yellow-700">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">{settlement.fromUser.name}</span>
                      <div className="text-center">
                        <span className="text-2xl font-bold text-yellow-300">₹{settlement.amount.toFixed(2)}</span>
                        <p className="text-yellow-400 text-sm">owes</p>
                      </div>
                      <span className="text-white font-medium">{settlement.toUser.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Finalize Button */}
          {plan.status === 'VOTING' && (
            <div className="mt-6 flex justify-center">
              <Button
                variant="primary"
                onClick={handleFinalizePlan}
                className="px-8 py-3"
              >
                Finalize Plan & Calculate Settlements
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Create Poll Modal */}
      <Modal
        isOpen={pollModalOpen}
        title="Create Poll"
        onClose={() => {
          setPollModalOpen(false);
          setPollQuestion('');
          setPollOptions(['', '']);
          setError('');
        }}
      >
        <FormInput
          label="Poll Question"
          name="question"
          value={pollQuestion}
          onChange={(e) => setPollQuestion(e.target.value)}
          placeholder="Where should we eat?"
          required
        />
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Options
          </label>
          {pollOptions.map((opt, idx) => (
            <input
              key={idx}
              type="text"
              value={opt}
              onChange={(e) => {
                const newOpts = [...pollOptions];
                newOpts[idx] = e.target.value;
                setPollOptions(newOpts);
              }}
              placeholder={`Option ${idx + 1}`}
              className="w-full mb-2 px-4 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          ))}
          <Button
            variant="secondary"
            className="w-full mt-2"
            onClick={() => setPollOptions([...pollOptions, ''])}
          >
            + Add Option
          </Button>
        </div>
        <div className="flex gap-2 mt-6">
          <Button variant="primary" className="flex-1" onClick={handleCreatePoll}>
            Create
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => {
              setPollModalOpen(false);
              setPollQuestion('');
              setPollOptions(['', '']);
              setError('');
            }}
          >
            Cancel
          </Button>
        </div>
      </Modal>

      {/* Add Expense Modal */}
      <Modal
        isOpen={expenseModalOpen}
        title="Add Expense"
        onClose={() => {
          setExpenseModalOpen(false);
          setExpenseAmount('');
          setExpenseDesc('');
          setExpenseCategory('FOOD');
          setError('');
        }}
      >
        <FormInput
          label="Amount (₹)"
          name="amount"
          type="number"
          value={expenseAmount}
          onChange={(e) => setExpenseAmount(e.target.value)}
          placeholder="100"
          required
        />
        <FormInput
          label="Description"
          name="description"
          value={expenseDesc}
          onChange={(e) => setExpenseDesc(e.target.value)}
          placeholder="Lunch at restaurant"
          required
        />
        <div className="mb-4">
          <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-2">
            Category
          </label>
          <select
            id="category"
            value={expenseCategory}
            onChange={(e) => setExpenseCategory(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="FOOD">Food</option>
            <option value="ENTERTAINMENT">Entertainment</option>
            <option value="TRANSPORT">Transport</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div className="flex gap-2 mt-6">
          <Button variant="primary" className="flex-1" onClick={handleAddExpense}>
            Add
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => {
              setExpenseModalOpen(false);
              setExpenseAmount('');
              setExpenseDesc('');
              setExpenseCategory('FOOD');
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

export default PlanPage;
