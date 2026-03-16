import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/Card';
import Button from '../components/Button';
import FormInput from '../components/FormInput';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) return;

    setError('');
    setLoading(true);

    try {
      await login(email, password);

      // clear form inputs after login
      setEmail('');
      setPassword('');

      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">

        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-blue-500 mb-2">Genout</h1>
          <p className="text-gray-400">Group Hangout Planner</p>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off">

          {error && (
            <div className="mb-4 p-3 bg-red-900 bg-opacity-50 border border-red-500 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <FormInput
            label="Email"
            name="email"
            type="email"
            autoComplete="on"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />

          <FormInput
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-6"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </Button>

        </form>

        <p className="text-center text-gray-400 text-sm mt-4">
          Don't have an account?{' '}
          <Link to="/signup" className="text-blue-500 hover:text-blue-400">
            Sign up
          </Link>
        </p>

      </Card>
    </div>
  );
};

export default LoginPage;