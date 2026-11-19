import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, isConfigured } from '../lib/supabase';
import { Users, AlertCircle, ArrowRight } from 'lucide-react';

export const JoinPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [groupInfo, setGroupInfo] = useState<{
    group_name: string;
    member_count: number;
    is_valid: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setError('Invalid invite code');
      setLoading(false);
      return;
    }

    if (!isConfigured) {
      setError('Supabase not configured yet.');
      setLoading(false);
      return;
    }

    const checkInvite = async () => {
      try {
        const { data, error } = await supabase.rpc('preview_invite_code', {
          invite_code: code,
        });

        if (error || !data || data.length === 0 || !data[0].is_valid) {
          setError('This invite link is invalid, expired, or reached max uses.');
        } else {
          setGroupInfo(data[0]);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error validating invite');
      } finally {
        setLoading(false);
      }
    };

    checkInvite();
  }, [code]);

  const handleJoin = async () => {
    if (!code) return;
    setJoining(true);

    // Check if user is logged in
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      // Store pending invite code in sessionStorage and redirect to sign up
      sessionStorage.setItem('pending_invite_code', code);
      navigate('/');
      return;
    }

    try {
      const { data: joinedGroupId, error: joinErr } = await supabase.rpc(
        'join_group_with_code',
        { invite_code: code }
      );

      if (joinErr) throw joinErr;

      // Navigate to main app with group selected
      navigate(`/?group=${joinedGroupId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to join group');
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#1e1f22] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-discord-side rounded-lg shadow-2xl p-8 border border-discord-border text-center">
        {loading ? (
          <div className="py-12 text-discord-muted text-sm">
            Validating invite link...
          </div>
        ) : error ? (
          <div className="py-6 space-y-4">
            <div className="w-14 h-14 rounded-full bg-discord-danger/20 text-discord-danger flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-discord-text">
              Invite Invalid
            </h2>
            <p className="text-xs text-discord-muted">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2.5 bg-discord-accent hover:bg-discord-accent-hover text-white rounded text-sm font-semibold transition-colors mt-4 inline-flex items-center space-x-2"
            >
              <span>Go to Home</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-discord-accent text-white flex items-center justify-center mx-auto text-3xl font-bold shadow-lg">
              {groupInfo?.group_name?.[0]?.toUpperCase() || 'G'}
            </div>

            <div>
              <p className="text-xs text-discord-muted uppercase tracking-wider font-semibold">
                You've been invited to join
              </p>
              <h2 className="text-2xl font-bold text-discord-text mt-1">
                {groupInfo?.group_name}
              </h2>
              <div className="flex items-center justify-center space-x-1.5 text-xs text-discord-muted mt-2">
                <Users className="w-3.5 h-3.5" />
                <span>{groupInfo?.member_count || 1} Members</span>
              </div>
            </div>

            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full py-3 bg-discord-accent hover:bg-discord-accent-hover text-white rounded text-sm font-semibold transition-colors flex items-center justify-center space-x-2 shadow"
            >
              <span>{joining ? 'Joining...' : 'Accept Invite'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

