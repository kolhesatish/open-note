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

IMPORTANT: Create diagrams for topics that involve:
- Processes, workflows, or step-by-step procedures
- System architectures, data flow, or component relationships
- Hierarchical structures, organizational charts, or decision trees
- Network topologies, database schemas, or API relationships
- Mathematical concepts, algorithms, or logical flows
- Any concept that would be clearer with visual representation

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

      // Check if response contains a Mermaid diagram (more robust detection)
      const hasDiagram = /```mermaid\s*\n?[\s\S]*?\n?```/i.test(responseText);

      // If no diagram was generated but the topic seems to need one, try to generate one
      if (!hasDiagram && this.shouldHaveDiagram(userMessage)) {
        console.log('Topic seems to need a diagram, but none was generated. Attempting to generate one...');
        try {
          const diagramResponse = await this.generateDiagramExplanation(userMessage);
          return {
            content: responseText + '\n\n' + diagramResponse.content,
            hasDiagram: true
          };
        } catch (diagramError) {
          console.error('Failed to generate additional diagram:', diagramError);
        }
      }

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

  async *generateStreamingResponse(userMessage, conversationHistory = []) {
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

IMPORTANT: Create diagrams for topics that involve:
- Processes, workflows, or step-by-step procedures
- System architectures, data flow, or component relationships
- Hierarchical structures, organizational charts, or decision trees
- Network topologies, database schemas, or API relationships
- Mathematical concepts, algorithms, or logical flows
- Any concept that would be clearer with visual representation

Context from conversation:
${context}

User question: ${userMessage}

Please provide:
1. A detailed theoretical explanation
2. If applicable, a Mermaid diagram to visualize the concept

Remember to use proper Mermaid syntax for diagrams (flowchart, graph, sequence, class, etc.).`;

      console.log('Starting Gemini streaming...');
      const result = await this.model.generateContentStream(enhancedPrompt);
      let fullResponse = '';
      let hasDiagram = false;

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        console.log('Gemini chunk received:', chunkText.substring(0, 50) + '...');
        fullResponse += chunkText;
        
        // Check for diagram in the accumulated response
        if (!hasDiagram) {
          hasDiagram = /```mermaid\s*\n?[\s\S]*?\n?```/i.test(fullResponse);
        }

        yield {
          type: 'chunk',
          content: chunkText,
          hasDiagram: hasDiagram,
          isComplete: false
        };
      }

      // Send final completion signal
      yield {
        type: 'complete',
        content: fullResponse,
        hasDiagram: hasDiagram,
        isComplete: true
      };

    } catch (error) {
      console.error('Gemini streaming error:', error);
      
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

  shouldHaveDiagram(userMessage) {
    const diagramKeywords = [
      'process', 'workflow', 'flow', 'diagram', 'chart', 'architecture', 'system',
      'database', 'schema', 'network', 'topology', 'algorithm', 'flowchart',
      'sequence', 'timeline', 'hierarchy', 'structure', 'relationship', 'model',
      'design pattern', 'api', 'component', 'module', 'pipeline', 'pipeline',
      'decision tree', 'state machine', 'uml', 'class diagram', 'entity relationship'
    ];
    
    const lowerMessage = userMessage.toLowerCase();
    return diagramKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  isConfigured() {
    return this.genAI !== null;
  }
}

module.exports = new GeminiService();