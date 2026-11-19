import Dexie, { type Table } from 'dexie';
import type { Message } from '../types/database';

export interface LocalOutboxMessage {
  client_id: string;
  chat_id: string;
  chat_type: 'dm' | 'group';
  sender_id: string;
  body: string;
  created_at: string;
  status: 'queued' | 'sending' | 'failed';
  retry_count: number;
  last_error?: string;
}

export interface CachedProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  updated_at: number;
}

export class GhostTextDatabase extends Dexie {
  messages!: Table<Message, string>;
  outbox!: Table<LocalOutboxMessage, string>;
  profiles!: Table<CachedProfile, string>;

  constructor() {
    super('GhostTextDB');
    this.version(1).stores({
      messages: 'id, client_id, chat_id, created_at, [chat_id+created_at]',
      outbox: 'client_id, chat_id, status, created_at',
      profiles: 'id, username',
    });
  }
}

export const localDb = new GhostTextDatabase();

