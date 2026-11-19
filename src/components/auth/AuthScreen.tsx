import React, { useState } from 'react';
import { MessageSquare, AlertCircle, Info } from 'lucide-react';
import { isConfigured } from '../../lib/supabase';

interface AuthScreenProps {
  onSignUp: (email: string, pass: string, username: string) => Promise<{ error: unknown | null }>;
  onSignIn: (email: string, pass: string) => Promise<{ error: unknown | null }>;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSignUp, onSignIn }) => {
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const pendingInvite = sessionStorage.getItem('pending_invite_code');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessNotice(null);

    if (!email.trim() || !password) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (!isLoginMode && !username.trim()) {
      setErrorMsg('Please provide a unique username.');
      return;
    }

    setLoading(true);
    try {
      if (isLoginMode) {
        const res = await onSignIn(email.trim(), password);
        if (res.error) {
          setErrorMsg((res.error as Error).message || 'Invalid email or password.');
        }
      } else {
        const res = await onSignUp(email.trim(), password, username.trim());
        if (res.error) {
          setErrorMsg((res.error as Error).message || 'Registration failed.');
        } else {
          setSuccessNotice(
            'Account created! If Supabase email confirmation is enabled, please verify your email. Otherwise you are logged in.'
          );
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#1e1f22] flex items-center justify-center p-4">
      <div className="w-full max-w-[480px] bg-discord-side rounded-lg shadow-2xl p-8 border border-discord-border">
        {/* App Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-3xl bg-discord-accent text-white flex items-center justify-center shadow-lg mb-3">
            <MessageSquare className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-bold text-discord-text tracking-wide">
            {isLoginMode ? 'Welcome back!' : 'Create an account'}
          </h1>
          <p className="text-sm text-discord-muted mt-1">
            {pendingInvite
              ? 'Join your friend on GhostText!'
              : isLoginMode
              ? "We're so excited to see you again!"
              : 'Chat, invite friends, and create groups.'}
          </p>
        </div>

        {/* Env Configuration Reminder Banner if not configured */}
        {!isConfigured && (
          <div className="mb-6 p-3.5 bg-discord-warn/15 border border-discord-warn/40 rounded-lg text-discord-warn text-xs space-y-1">
            <div className="flex items-center space-x-1.5 font-bold">
              <Info className="w-4 h-4 flex-shrink-0" />
              <span>Supabase Connection Needed</span>
            </div>
            <p className="leading-relaxed">
              Create a Supabase project, execute <code className="bg-black/30 px-1 py-0.5 rounded font-mono">supabase/schema.sql</code> in the SQL Editor, and add your keys to <code className="bg-black/30 px-1 py-0.5 rounded font-mono">.env</code>.
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLoginMode && (
            <div>
              <label className="block text-xs font-bold text-discord-muted uppercase tracking-wider mb-2">
                Username <span className="text-discord-danger">*</span>
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Umesh"
                className="w-full bg-[#1e1f22] border border-discord-border rounded px-3 py-2.5 text-sm text-discord-text focus:outline-none focus:border-discord-accent transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-discord-muted uppercase tracking-wider mb-2">
              Email <span className="text-discord-danger">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-[#1e1f22] border border-discord-border rounded px-3 py-2.5 text-sm text-discord-text focus:outline-none focus:border-discord-accent transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-discord-muted uppercase tracking-wider mb-2">
              Password <span className="text-discord-danger">*</span>
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full bg-[#1e1f22] border border-discord-border rounded px-3 py-2.5 text-sm text-discord-text focus:outline-none focus:border-discord-accent transition-colors"
            />
          </div>

          {errorMsg && (
            <div className="flex items-center space-x-2 text-xs text-discord-danger bg-discord-danger/10 p-3 rounded border border-discord-danger/20">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successNotice && (
            <div className="text-xs text-discord-online bg-discord-online/10 p-3 rounded border border-discord-online/20 leading-relaxed">
              {successNotice}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded text-sm font-semibold text-white transition-colors ${
              loading
                ? 'bg-discord-accent/50 cursor-not-allowed'
                : 'bg-discord-accent hover:bg-discord-accent-hover'
            }`}
          >
            {loading ? 'Please wait...' : isLoginMode ? 'Log In' : 'Continue'}
          </button>
        </form>

        <div className="mt-5 text-xs text-discord-muted">
          {isLoginMode ? (
            <span>
              Need an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsLoginMode(false);
                  setErrorMsg(null);
                }}
                className="text-discord-accent hover:underline font-medium"
              >
                Register
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsLoginMode(true);
                  setErrorMsg(null);
                }}
                className="text-discord-accent hover:underline font-medium"
              >
                Log In
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

