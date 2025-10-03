require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.model = 'gemini-2.0-flash';
    this.baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;

    // Initialize SDK client for streaming when possible
    this.genAI = null;
    this.generativeModel = null;
    if (this.apiKey) {
      try {
        this.genAI = new GoogleGenerativeAI(this.apiKey);
        this.generativeModel = this.genAI.getGenerativeModel({ model: this.model });
      } catch (e) {
        // If SDK init fails, non-streaming methods will still work via REST
        this.genAI = null;
        this.generativeModel = null;
      }
    }
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  async generate(prompt, retries = 3) {
    if (!this.isConfigured()) {
      throw new Error('Gemini API key not configured');
    }

    // Validate and sanitize prompt
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new Error('Invalid prompt provided');
    }

    const sanitizedPrompt = prompt.trim().substring(0, 100000); // Limit prompt length

    const url = `${this.baseUrl}?key=${this.apiKey}`;

    const body = {
      contents: [
        {
          parts: [{ text: sanitizedPrompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.7,
        topP: 0.8,
        topK: 40
      }
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`🔄 Gemini API attempt ${attempt}/${retries}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const response = await fetch(url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'User-Agent': 'OpenNote-Backend/1.0'
          },
          body: JSON.stringify(body),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          const errorMessage = `Gemini API request failed: ${response.status} ${response.statusText}`;
          
          // Handle specific error cases
          if (response.status === 429) {
            console.log('⚠️ Rate limit hit, waiting before retry...');
            if (attempt < retries) {
              await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Exponential backoff
              continue;
            }
          } else if (response.status >= 500) {
            console.log('⚠️ Server error, retrying...');
            if (attempt < retries) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
              continue;
            }
          }
          
          throw new Error(`${errorMessage} ${errorText}`);
        }

        const data = await response.json();
        
        // Validate response structure
        if (!data || !data.candidates || !Array.isArray(data.candidates)) {
          throw new Error('Invalid response structure from Gemini API');
        }

        const parts = data.candidates[0]?.content?.parts || [];
        const text = parts.map((p) => p?.text).filter(Boolean).join('\n').trim();
        
        if (!text) {
          throw new Error('Empty response from Gemini API');
        }

        console.log(`✅ Gemini API success on attempt ${attempt}`);
        return text;

      } catch (error) {
        console.error(`❌ Gemini API attempt ${attempt} failed:`, error.message);
        
        if (error.name === 'AbortError') {
          console.log('⏰ Request timeout');
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          console.log('🌐 Network error');
        }

        if (attempt === retries) {
          throw new Error(`Failed to generate response after ${retries} attempts: ${error.message}`);
        }

        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  _buildEnhancedPrompt(userMessage, conversationHistory = []) {
    const context = conversationHistory
      .slice(-6)
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    const enhancedPrompt = `You are an intelligent AI assistant that provides comprehensive explanations. When responding to questions:\n\n1. ALWAYS provide a clear theoretical explanation first\n2. If the topic can benefit from a visual representation, create a Mermaid diagram\n3. Format Mermaid diagrams with proper syntax wrapped in \`\`\`mermaid and \`\`\`\n\nContext from conversation:\n${context}\n\nUser question: ${userMessage}\n\nPlease provide:\n1. A detailed theoretical explanation\n2. If applicable, a Mermaid diagram to visualize the concept\n\nRemember to use proper Mermaid syntax for diagrams (flowchart, graph, sequence, class, etc.).`;

    return enhancedPrompt;
  }

  async generateResponse(userMessage, conversationHistory = []) {
    const enhancedPrompt = this._buildEnhancedPrompt(userMessage, conversationHistory);
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

  _chunkText(text, size) {
    const chunks = [];
    for (let i = 0; i < text.length; i += size) {
      chunks.push(text.slice(i, i + size));
    }
    return chunks;
  }

  async *generateStreamingResponse(userMessage, conversationHistory = []) {
    if (!this.isConfigured()) {
      throw new Error('Gemini API key not configured');
    }

    const enhancedPrompt = this._buildEnhancedPrompt(userMessage, conversationHistory);

    // Try real streaming via SDK first
    if (this.generativeModel && typeof this.generativeModel.generateContentStream === 'function') {
      try {
        const result = await this.generativeModel.generateContentStream({
          contents: [
            {
              role: 'user',
              parts: [{ text: enhancedPrompt }],
            },
          ],
        });

        let full = '';
        // result.stream should be an async iterable
        if (result && result.stream && typeof result.stream[Symbol.asyncIterator] === 'function') {
          for await (const event of result.stream) {
            let delta = '';
            try {
              if (typeof event.text === 'function') {
                // Some SDK versions expose text() to get accumulated chunk text
                delta = event.text();
              } else if (typeof event.text === 'string') {
                delta = event.text;
              } else {
                const candidateText = Array.isArray(event?.candidates)
                  ? (event.candidates[0]?.content?.parts || [])
                      .map((p) => p?.text || '')
                      .join('')
                  : '';
                delta = candidateText;
              }
            } catch (_) {
              delta = '';
            }

            if (!delta) continue;
            full += delta;
            yield {
              content: delta,
              hasDiagram: /```mermaid/.test(full),
              isComplete: false,
            };
          }

          yield {
            content: '',
            hasDiagram: /```mermaid/.test(full),
            isComplete: true,
          };
          return;
        }
      } catch (_) {
        // Fallback below
      }
    }

    // Fallback: non-streaming request, then chunk locally
    const finalText = await this.generate(enhancedPrompt);
    let acc = '';
    for (const piece of this._chunkText(finalText, 500)) {
      acc += piece;
      yield {
        content: piece,
        hasDiagram: /```mermaid/.test(acc),
        isComplete: false,
      };
    }
    yield {
      content: '',
      hasDiagram: /```mermaid/.test(acc),
      isComplete: true,
    };
  }
}

module.exports = new GeminiService();
