export interface User {
  id: number;
  username: string;
  email: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  username: string;
  email: string;
  password: string;
}

export interface ChatSession {
  id: number;
  user_id: number;
  title: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  chat_session_id: number;
  role: 'user' | 'assistant';
  content: string;
  has_diagram: boolean;
  created_at: string;
}

export interface ChatSessionWithMessages {
  session: ChatSession;
  messages: Message[];
}

export interface SendMessageResponse {
  userMessage: Message;
  assistantMessage: Message;
}

export interface ApiError {
  error: string;
  details?: string;
}