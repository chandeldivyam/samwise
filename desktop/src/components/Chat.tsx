// src/components/Chat.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { Segment, asSrt } from '~/lib/transcript'
import { usePreferenceProvider } from '~/providers/Preference';
import { useFilesContext } from '~/providers/FilesProvider';
import { ReactComponent as DeleteIcon } from '~/icons/cancel.svg';
import { ModifyState } from '~/lib/utils'

interface ChatProps {
  segments: Segment[] | null;
  messages: Message[];
  setMessages: ModifyState<Message[]>
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const Chat: React.FC<ChatProps> = ({ segments, messages, setMessages }) => {
  const { t } = useTranslation();
  const preference = usePreferenceProvider();
  const { files } = useFilesContext();
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !segments) return;

    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
    };

    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const contextMessage = {
        role: 'user',
        content: 'You are a helpful assistant. The following is a transcript of a conversation or speech. Please use this context to answer the user\'s questions.',
      };

      const transcriptMessage = {
        role: 'user',
        content: asSrt(segments),
      };

      const chatMessages = [
        contextMessage,
        transcriptMessage,
        ...messages.map(({ role, content }) => ({ role, content })),
        { role: 'user', content: inputMessage },
      ];

      const options = {
        ollama_base_url: preference.chatModelOptions.ollama_base_url,
        ollama_model: preference.chatModelOptions.ollama_model,
        google_api_key: preference.chatModelOptions.gemini_api_key,
        max_output_tokens: 1024,
      };

      const result = await invoke<string>('process_chat_message', {
        options,
        messages: chatMessages,
        strategyStr: preference.chatModelOptions.strategy,
      });

      const newAssistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: result,
      };

      setMessages((prevMessages) => [...prevMessages, newAssistantMessage]);

    } catch (error) {
      console.error('Error in chat:', error);
      alert(t('common.chat-error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMessage = (id: string) => {
    setMessages((prevMessages) => prevMessages.filter((message) => message.id !== id));
  };

  return (
    <div className="w-full h-full bg-base-200 p-4 rounded-lg flex flex-col">
      <h2 className="text-2xl font-bold mb-4 text-base-content">{t('common.chat')}</h2>
      
      <div ref={chatContainerRef} className="flex-grow overflow-auto mb-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-3/4 p-3 rounded-lg relative group ${
              message.role === 'user' 
                ? 'bg-primary text-primary-content' 
                : 'bg-neutral text-neutral-content'
            }`}>
              {message.content}
              <button 
                onClick={() => handleDeleteMessage(message.id)} 
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              >
                <DeleteIcon className="w-4 h-4 text-base-content hover:text-error" />
              </button>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-neutral text-neutral-content p-3 rounded-lg">
              <span className="loading loading-dots loading-sm"></span>
            </div>
          </div>
        )}
      </div>

      <div className="flex">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder={t('common.type-message')}
          className="input input-bordered flex-grow mr-2 bg-base-100 text-base-content"
          disabled={isLoading}
        />
        <button
          onClick={handleSendMessage}
          disabled={isLoading || !inputMessage.trim()}
          className="btn btn-primary"
        >
          {t('common.send')}
        </button>
      </div>
    </div>
  );
};

export default Chat;
