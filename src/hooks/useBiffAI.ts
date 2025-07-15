/**
 * React hook for interacting with Biff AI
 */

import { useState, useCallback, useRef } from 'react';
import { createBiffAI, type BiffAIService } from '@/lib/ai/biff-ai-service';
import type { BiffResponse } from '@/lib/ai/biff-character';

interface UseBiffAIOptions {
  apiKey: string;
  maxHistoryLength?: number;
  onError?: (error: Error) => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  response?: BiffResponse;
}

export function useBiffAI({ 
  apiKey, 
  maxHistoryLength = 10,
  onError 
}: UseBiffAIOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Initialize Biff AI service
  const biffRef = useRef<BiffAIService | null>(null);
  if (!biffRef.current && apiKey) {
    biffRef.current = createBiffAI(apiKey);
  }

  /**
   * Send a message to Biff
   */
  const sendMessage = useCallback(async (
    message: string,
    context?: {
      partySize?: number;
      partyType?: string;
      location?: string;
    }
  ) => {
    if (!biffRef.current) {
      const err = new Error('Biff AI not initialized. Please provide an API key.');
      setError(err);
      onError?.(err);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Add user message to history
      const userMessage: ChatMessage = {
        role: 'user',
        content: message,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, userMessage]);

      // Prepare conversation history for API
      const previousMessages = messages
        .slice(-maxHistoryLength)
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      // Get Biff's response
      const response = await biffRef.current.chat(message, {
        ...context,
        previousMessages
      });

      // Add Biff's response to history
      const biffMessage: ChatMessage = {
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        response
      };

      setMessages(prev => [...prev, biffMessage]);

      // Trigger special effect if present
      if (response.specialEffect) {
        // Could trigger an animation or sound effect here
        console.log('🎉 Special Effect:', response.specialEffect);
      }

      return response;
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [messages, maxHistoryLength, onError]);

  /**
   * Clear conversation history
   */
  const clearHistory = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  /**
   * Get a greeting from Biff
   */
  const getGreeting = useCallback(async () => {
    return sendMessage("Howdy Biff! I'm planning a party!");
  }, [sendMessage]);

  /**
   * Quick actions for common requests
   */
  const quickActions = {
    estimateDrinks: useCallback(async (guestCount: number) => {
      return sendMessage(
        `I need drinks for ${guestCount} people. What do you recommend?`,
        { partySize: guestCount }
      );
    }, [sendMessage]),

    suggestTheme: useCallback(async (partyType: string) => {
      return sendMessage(
        `I'm planning a ${partyType}. What apocalyptic theme would you suggest?`,
        { partyType }
      );
    }, [sendMessage]),

    partyPackage: useCallback(async (size: 'small' | 'medium' | 'large' | 'epic') => {
      const sizeMap = { small: 10, medium: 25, large: 50, epic: 100 };
      return sendMessage(
        `What's your best party package for ${sizeMap[size]} survivors?`,
        { partySize: sizeMap[size] }
      );
    }, [sendMessage])
  };

  return {
    // State
    messages,
    isLoading,
    error,
    
    // Actions
    sendMessage,
    clearHistory,
    getGreeting,
    quickActions,
    
    // Computed values
    lastMessage: messages[messages.length - 1],
    lastBiffResponse: messages
      .filter(m => m.role === 'assistant')
      .slice(-1)[0]?.response,
    conversationLength: messages.length
  };
}