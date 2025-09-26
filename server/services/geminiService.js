require('dotenv').config();

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.model = 'gemini-2.0-flash';
    this.baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  async generate(prompt) {
    if (!this.isConfigured()) {
      throw new Error('Gemini API key not configured');
    }

    const url = `${this.baseUrl}?key=${this.apiKey}`;

    const body = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Gemini API request failed: ${response.status} ${response.statusText} ${text}`);
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const text = parts.map((p) => p?.text).filter(Boolean).join('\n').trim();
    return text || 'No response generated.';
  }

  async generateResponse(userMessage, conversationHistory = []) {
    const context = conversationHistory
      .slice(-6)
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    const enhancedPrompt = `You are an intelligent AI assistant that provides comprehensive explanations. When responding to questions:\n\n1. ALWAYS provide a clear theoretical explanation first\n2. If the topic can benefit from a visual representation, create a Mermaid diagram\n3. Format Mermaid diagrams with proper syntax wrapped in \`\`\`mermaid and \`\`\`\n\nContext from conversation:\n${context}\n\nUser question: ${userMessage}\n\nPlease provide:\n1. A detailed theoretical explanation\n2. If applicable, a Mermaid diagram to visualize the concept\n\nRemember to use proper Mermaid syntax for diagrams (flowchart, graph, sequence, class, etc.).`;

    const responseText = await this.generate(enhancedPrompt);
    const hasDiagram = /```mermaid/.test(responseText);
    return { content: responseText, hasDiagram };
  }

  async generateDiagramExplanation(topic) {
    const prompt = `Create a detailed explanation with a Mermaid diagram for: ${topic}\n\nPlease provide:\n1. A brief explanation of the concept\n2. A Mermaid diagram that visualizes the key components and relationships\n3. Use appropriate Mermaid diagram types (flowchart, sequence, class, etc.)\n\nFormat the diagram properly with \`\`\`mermaid and \`\`\` tags.`;

    const responseText = await this.generate(prompt);
    const hasDiagram = /```mermaid/.test(responseText);
    return { content: responseText, hasDiagram };
  }
}

module.exports = new GeminiService();
