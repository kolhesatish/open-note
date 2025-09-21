const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

class GeminiService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY not found. AI features will be disabled.');
      this.genAI = null;
      return;
    }

    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async generateResponse(userMessage, conversationHistory = []) {
    if (!this.genAI) {
      throw new Error('Gemini API key not configured');
    }

    try {
      // Build conversation context
      let context = '';
      if (conversationHistory.length > 0) {
        context = conversationHistory
          .slice(-6) // Last 6 messages for context
          .map(msg => `${msg.role}: ${msg.content}`)
          .join('\n') + '\n';
      }

      // Enhanced prompt for theory and diagram generation
      const enhancedPrompt = `You are an intelligent AI assistant that provides comprehensive explanations. When responding to questions:

1. ALWAYS provide a clear theoretical explanation first
2. If the topic can benefit from a visual representation, create a Mermaid diagram
3. Format Mermaid diagrams with proper syntax wrapped in \`\`\`mermaid and \`\`\`

Context from conversation:
${context}

User question: ${userMessage}

Please provide:
1. A detailed theoretical explanation
2. If applicable, a Mermaid diagram to visualize the concept

Remember to use proper Mermaid syntax for diagrams (flowchart, graph, sequence, class, etc.).`;

      const result = await this.model.generateContent(enhancedPrompt);
      const response = await result.response;
      const responseText = response.text();

      // Check if response contains a Mermaid diagram
      const hasDiagram = responseText.includes('```mermaid');

      return {
        content: responseText,
        hasDiagram: hasDiagram
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      
      if (error.message.includes('API_KEY_INVALID')) {
        throw new Error('Invalid Gemini API key');
      } else if (error.message.includes('RATE_LIMIT_EXCEEDED')) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (error.message.includes('SAFETY')) {
        throw new Error('Content filtered by safety settings');
      }
      
      throw new Error('AI service temporarily unavailable');
    }
  }

  async generateDiagramExplanation(topic) {
    if (!this.genAI) {
      throw new Error('Gemini API key not configured');
    }

    try {
      const prompt = `Create a detailed explanation with a Mermaid diagram for: ${topic}

Please provide:
1. A brief explanation of the concept
2. A Mermaid diagram that visualizes the key components and relationships
3. Use appropriate Mermaid diagram types (flowchart, sequence, class, etc.)

Format the diagram properly with \`\`\`mermaid and \`\`\` tags.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();

      return {
        content: responseText,
        hasDiagram: true
      };
    } catch (error) {
      console.error('Diagram generation error:', error);
      throw new Error('Failed to generate diagram explanation');
    }
  }

  isConfigured() {
    return this.genAI !== null;
  }
}

module.exports = new GeminiService();