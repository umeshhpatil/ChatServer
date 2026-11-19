export type FriendshipStatus = 'pending' | 'accepted' | 'declined';
export type GroupRole = 'owner' | 'admin' | 'member';
export type ChatType = 'dm' | 'group';

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  status?: string;
  created_at?: string;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  requester?: Profile;
  addressee?: Profile;
}

export interface Group {
  id: string;
  name: string;
  owner_id: string;
  icon_url: string | null;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: GroupRole;
  created_at: string;
  profile?: Profile;
}

export interface GroupInvite {
  id: string;
  group_id: string;
  inviter_id: string;
  invitee_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  group?: Group;
  inviter?: Profile;
}

export interface GroupInviteLink {
  code: string;
  group_id: string;
  created_by: string;
  expires_at: string;
  max_uses: number;
  uses: number;
  created_at: string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ReactionGroup {
  emoji: string;
  count: number;
  hasReacted: boolean;
  users: string[];
}

export interface Message {
  id: string;
  chat_type: ChatType;
  chat_id: string;
  sender_id: string;
  body: string;
  client_id?: string;
  created_at: string;
  sender?: Profile;
  status?: 'sent' | 'queued' | 'sending' | 'failed';
  reactions?: ReactionGroup[];
}
