import axios, { AxiosInstance, AxiosError } from 'axios';
import { 
  AuthResponse, 
  LoginCredentials, 
  SignupCredentials, 
  ChatSession, 
  ChatSessionWithMessages,
  SendMessageResponse,
  Message as MessageType
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to requests if available
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle 401 responses
    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication endpoints
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.api.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  }

  async signup(credentials: SignupCredentials): Promise<AuthResponse> {
    const response = await this.api.post<AuthResponse>('/auth/signup', credentials);
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.api.get('/auth/me');
    return response.data;
  }

  async logout() {
    await this.api.post('/auth/logout');
  }

  // Chat endpoints
  async getChatSessions(): Promise<{ sessions: ChatSession[] }> {
    const response = await this.api.get<{ sessions: ChatSession[] }>('/chat/sessions');
    return response.data;
  }

  async createChatSession(title?: string): Promise<{ session: ChatSession }> {
    const response = await this.api.post<{ session: ChatSession }>('/chat/sessions', { title });
    return response.data;
  }

  async getChatSession(sessionId: number): Promise<ChatSessionWithMessages> {
    const response = await this.api.get<ChatSessionWithMessages>(`/chat/sessions/${sessionId}`);
    return response.data;
  }

  async updateChatSessionTitle(sessionId: number, title: string): Promise<{ session: ChatSession }> {
    const response = await this.api.put<{ session: ChatSession }>(`/chat/sessions/${sessionId}`, { title });
    return response.data;
  }

  async deleteChatSession(sessionId: number): Promise<{ message: string }> {
    const response = await this.api.delete<{ message: string }>(`/chat/sessions/${sessionId}`);
    return response.data;
  }

  async sendMessage(sessionId: number, content: string): Promise<SendMessageResponse> {
    const response = await this.api.post<SendMessageResponse>(`/chat/sessions/${sessionId}/messages`, { content });
    return response.data;
  }

  async sendMessageStream(
    sessionId: number, 
    content: string,
    onChunk: (chunk: string) => void,
    onComplete: (message: MessageType) => void,
    onError: (error: string) => void
  ): Promise<void> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    console.log('Starting streaming request to:', `${API_BASE_URL}/chat/sessions/${sessionId}/messages/stream`);
    
    const response = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}/messages/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ content }),
    });

    console.log('Streaming response status:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body reader available');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              console.log('Received SSE data:', data);
              
              switch (data.type) {
                case 'chunk':
                  console.log('Processing chunk:', data.content.substring(0, 50) + '...');
                  onChunk(data.content);
                  break;
                case 'complete':
                  console.log('Streaming complete:', data.data);
                  onComplete(data.data);
                  break;
                case 'error':
                  console.error('Streaming error:', data.error);
                  onError(data.error);
                  break;
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async regenerateResponse(sessionId: number): Promise<{ assistantMessage: MessageType }> {
    const response = await this.api.post<{ assistantMessage: MessageType }>(`/chat/sessions/${sessionId}/regenerate`);
    return response.data;
  }

  // Utility methods
  setAuthToken(token: string) {
    localStorage.setItem('auth_token', token);
  }

  removeAuthToken() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  }

  getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }
}

export const apiService = new ApiService();
export default apiService;
