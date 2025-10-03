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
import API_CONFIG from '../config/api';

const API_BASE_URL = API_CONFIG.BASE_URL;

class ApiService {
  private api: AxiosInstance;

  constructor() {
    console.log('🔗 Initializing API Service with base URL:', API_BASE_URL);
    
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
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

  async sendMessage(sessionId: number, content: string, retries: number = 3): Promise<SendMessageResponse> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`📤 Send message attempt ${attempt}/${retries} for session ${sessionId}`);
        
        const response = await this.api.post<SendMessageResponse>(`/chat/sessions/${sessionId}/messages`, { content });
        
        if (response.data && response.data.assistantMessage) {
          console.log(`✅ Send message successful on attempt ${attempt}`);
          return response.data;
        } else {
          throw new Error('Invalid response structure');
        }
      } catch (error: any) {
        console.error(`❌ Send message attempt ${attempt} failed:`, error);
        
        // Don't retry on client errors (4xx)
        if (error.response?.status >= 400 && error.response?.status < 500) {
          throw error;
        }
        
        // Don't retry on last attempt
        if (attempt === retries) {
          throw new Error(`Failed to send message after ${retries} attempts: ${error.message}`);
        }
        
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    throw new Error('Unexpected error in send message');
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
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
      credentials: 'include',
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

  async regenerateResponse(sessionId: number, retries: number = 3): Promise<{ assistantMessage: MessageType }> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`🔄 Regenerate attempt ${attempt}/${retries} for session ${sessionId}`);
        
        const response = await this.api.post<{ assistantMessage: MessageType }>(`/chat/sessions/${sessionId}/regenerate`);
        
        if (response.data && response.data.assistantMessage) {
          console.log(`✅ Regenerate successful on attempt ${attempt}`);
          return response.data;
        } else {
          throw new Error('Invalid response structure');
        }
      } catch (error: any) {
        console.error(`❌ Regenerate attempt ${attempt} failed:`, error);
        
        // Don't retry on client errors (4xx)
        if (error.response?.status >= 400 && error.response?.status < 500) {
          throw error;
        }
        
        // Don't retry on last attempt
        if (attempt === retries) {
          throw new Error(`Failed to regenerate response after ${retries} attempts: ${error.message}`);
        }
        
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    throw new Error('Unexpected error in regenerate response');
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

  // Test API connection
  async testConnection(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      console.log('🧪 Testing API connection to:', API_BASE_URL);
      const response = await this.api.get('/ping');
      console.log('✅ API connection test successful:', response.data);
      return {
        success: true,
        message: 'API connection successful',
        data: response.data
      };
    } catch (error: any) {
      console.error('❌ API connection test failed:', error);
      return {
        success: false,
        message: error.response?.data?.error || error.message || 'API connection failed'
      };
    }
  }

  // Get API health status
  async getHealthStatus(): Promise<{ success: boolean; data?: any }> {
    try {
      const response = await this.api.get('/health');
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('❌ Health check failed:', error);
      return {
        success: false
      };
    }
  }
}

export const apiService = new ApiService();
export default apiService;
