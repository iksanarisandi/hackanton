export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  JWT_SECRET: string;
  ENVIRONMENT: string;
}

export interface User {
  id: number;
  email: string;
  password: string;
  created_at: string;
  updated_at: string;
}

export interface Idea {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  tags: string | null;
  status: 'draft' | 'in_progress' | 'ready' | 'published';
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  id: number;
  idea_id: number;
  file_name: string;
  file_url: string;
  size: number;
  type: 'file' | 'url';
  created_at: string;
}

export interface JWTPayload {
  userId: number;
  email: string;
  exp: number;
}
