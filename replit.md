# Overview

This is a full-stack AI-powered chat application similar to ChatGPT, built with React and Node.js. The application allows users to create multiple chat sessions, interact with Google's Gemini AI, and generate both theoretical explanations and visual diagrams using Mermaid.js. Users can manage their chat sessions with features like renaming, deleting, and creating new conversations.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Technology Stack**: React 18 with TypeScript, TailwindCSS for styling, and React Router for navigation.

**Component Structure**: The frontend follows a modular component-based architecture with:
- Context-based state management for authentication using React Context API
- Protected routes that redirect unauthenticated users to login
- Reusable components for chat interface (ChatInput, Message, Sidebar)
- Service layer pattern with a centralized API service using Axios

**State Management**: Uses React Context for global authentication state and local component state for chat data. This approach was chosen for simplicity over Redux, as the application's state requirements are moderate.

**UI/UX Design**: Implements a ChatGPT-like interface with a collapsible sidebar for chat sessions and a main chat window. TailwindCSS provides utility-first styling for rapid development and consistent design.

## Backend Architecture

**Server Framework**: Express.js with Node.js, providing a RESTful API structure.

**Database Design**: PostgreSQL with a relational schema including:
- Users table for authentication
- Chat sessions table linking to users
- Messages table storing conversation history
- Proper foreign key relationships and indexes for performance

**Authentication**: JWT-based authentication with bcrypt for password hashing. Tokens expire after 7 days and include user identification for session management.

**Security Measures**: Implements Helmet for security headers, CORS configuration, rate limiting for auth and chat endpoints, and input validation.

**API Structure**: Organized into separate route modules:
- `/api/auth` for user authentication (signup, login)
- `/api/chat` for chat session and message management
- `/api/ping` for health checks and preventing server sleep

## Data Storage Solutions

**Primary Database**: PostgreSQL chosen for its ACID compliance and relational data integrity, essential for user sessions and message history.

**Data Models**: 
- User model with secure password storage
- ChatSession model linking users to conversations
- Message model storing conversation content with diagram flags
- Database connection pooling for efficient resource management

## Authentication and Authorization

**Authentication Flow**: JWT tokens stored in localStorage on frontend, automatically attached to API requests via Axios interceptors.

**Authorization**: Middleware-based route protection ensuring users can only access their own chat sessions and messages.

**Security Features**: Rate limiting on authentication endpoints, password strength requirements, email validation, and automatic token refresh handling.

## AI Integration Architecture

**AI Service**: Integrated with Google Gemini API using the official SDK. The service generates both theoretical explanations and Mermaid diagrams based on user queries.

**Response Processing**: Custom prompt engineering to ensure responses include both explanatory text and visual diagrams when appropriate. Mermaid.js renders diagrams client-side for better performance.

**Context Management**: Maintains conversation history (last 6 messages) for contextual AI responses while managing token limits.

# External Dependencies

## AI Services
- **Google Gemini API**: Primary AI service for generating chat responses and explanations
- **@google/generative-ai**: Official Google SDK for Gemini integration

## Database
- **PostgreSQL**: Primary database for user data, chat sessions, and message storage
- **pg**: PostgreSQL client library for Node.js with connection pooling

## Authentication & Security
- **jsonwebtoken**: JWT token generation and verification
- **bcryptjs**: Password hashing and comparison
- **helmet**: Security middleware for Express
- **express-rate-limit**: API rate limiting
- **cors**: Cross-origin resource sharing configuration

## Frontend Libraries
- **React Router DOM**: Client-side routing and navigation
- **Axios**: HTTP client for API communication
- **react-markdown**: Markdown rendering for chat messages
- **Mermaid.js**: Diagram rendering library for visual explanations
- **Lucide React**: Icon library for UI components

## Development Tools
- **TailwindCSS**: Utility-first CSS framework
- **TypeScript**: Type safety for both frontend and backend
- **Nodemon**: Development server auto-restart
- **PostCSS & Autoprefixer**: CSS processing and vendor prefixes

## Deployment Infrastructure
- **Vercel**: Planned deployment platform for both frontend and backend
- **Environment Variables**: Configuration for API keys, database URLs, and JWT secrets