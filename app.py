from flask import Flask, render_template, request, jsonify, session
import openai
import os
import uuid
from database import init_db, save_message, get_chat_history, create_chat_session
import json
import re

app = Flask(__name__)
app.secret_key = os.getenv('SESSION_SECRET', 'fallback-secret-key-for-development')

# Initialize OpenAI
openai.api_key = os.getenv('OPENAI_API_KEY', 'default_key')

# Initialize database
init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/chat')
def chat():
    if 'chat_id' not in session:
        session['chat_id'] = str(uuid.uuid4())
        create_chat_session(session['chat_id'])
    
    chat_history = get_chat_history(session['chat_id'])
    return render_template('chat.html', chat_history=chat_history)

@app.route('/api/send_message', methods=['POST'])
def send_message():
    try:
        data = request.get_json()
        user_message = data.get('message', '').strip()
        
        if not user_message:
            return jsonify({'error': 'Message cannot be empty'}), 400
        
        if 'chat_id' not in session:
            session['chat_id'] = str(uuid.uuid4())
            create_chat_session(session['chat_id'])
        
        chat_id = session['chat_id']
        
        # Save user message
        save_message(chat_id, 'user', user_message)
        
        # Get chat history for context
        chat_history = get_chat_history(chat_id)
        
        # Prepare messages for OpenAI API
        messages = [
            {
                "role": "system", 
                "content": "You are a helpful AI assistant. When users ask for diagrams, charts, or visual representations, provide the response in a format that can be rendered using Mermaid.js. Always wrap mermaid diagrams with ```mermaid and ``` tags. For other responses, be helpful and conversational."
            }
        ]
        
        # Add chat history (limit to last 10 messages for context)
        for msg in chat_history[-10:]:
            messages.append({
                "role": msg['role'],
                "content": msg['content']
            })
        
        # Call OpenAI API
        try:
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=messages,
                max_tokens=2000,
                temperature=0.7
            )
            
            ai_response = response.choices[0].message.content
            
            # Save AI response
            save_message(chat_id, 'assistant', ai_response)
            
            # Check if response contains mermaid diagram
            has_diagram = '```mermaid' in ai_response
            
            return jsonify({
                'response': ai_response,
                'has_diagram': has_diagram
            })
            
        except Exception as e:
            error_msg = f"AI service error: {str(e)}"
            save_message(chat_id, 'assistant', error_msg)
            return jsonify({'error': error_msg}), 500
            
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/new_chat', methods=['POST'])
def new_chat():
    session['chat_id'] = str(uuid.uuid4())
    create_chat_session(session['chat_id'])
    return jsonify({'success': True, 'chat_id': session['chat_id']})

@app.route('/api/chat_history')
def api_chat_history():
    if 'chat_id' not in session:
        return jsonify({'history': []})
    
    chat_history = get_chat_history(session['chat_id'])
    return jsonify({'history': chat_history})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
