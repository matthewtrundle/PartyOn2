/**
 * Biff AI Service - Integrates with OpenRouter API
 * Handles all AI interactions for our cowboy robot party planner
 */

import { 
  BIFF_SYSTEM_PROMPT, 
  // BIFF_GUARDRAILS,
  BIFF_RESPONSE_TEMPLATES,
  BIFF_INVENTORY_MODIFIERS,
  validateBiffResponse,
  type BiffResponse 
} from './biff-character';

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export class BiffAIService {
  private apiKey: string;
  private apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
  private model = 'anthropic/claude-3-haiku'; // Fast and cost-effective for character responses
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Send a message to Biff and get his response
   */
  async chat(userMessage: string, context?: {
    partySize?: number;
    partyType?: string;
    location?: string;
    previousMessages?: OpenRouterMessage[];
  }): Promise<BiffResponse> {
    try {
      // Build conversation history
      const messages: OpenRouterMessage[] = [
        { role: 'system', content: BIFF_SYSTEM_PROMPT },
        ...(context?.previousMessages || []),
        { role: 'user', content: this.enhanceUserMessage(userMessage, context) }
      ];

      // Prepare request
      const request: OpenRouterRequest = {
        model: this.model,
        messages,
        max_tokens: 300,
        temperature: 0.9, // Higher for more creative responses
        top_p: 0.95,
        frequency_penalty: 0.5, // Reduce repetition
        presence_penalty: 0.3 // Encourage variety
      };

      // Make API call
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://partyondelivery.com',
          'X-Title': 'Party On Delivery - Biff AI'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.statusText}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

      // Validate and process response
      if (!validateBiffResponse(aiResponse)) {
        // If validation fails, return a fallback response
        return this.getFallbackResponse();
      }

      // Parse and enhance response
      return this.processBiffResponse(aiResponse, userMessage);
      
    } catch (error) {
      console.error('Biff AI Service Error:', error);
      return this.getFallbackResponse();
    }
  }

  /**
   * Enhance user message with context
   */
  private enhanceUserMessage(message: string, context?: Record<string, unknown>): string {
    let enhanced = message;
    
    if (context?.partySize) {
      enhanced += ` [Party size: ${context.partySize} people]`;
    }
    if (context?.partyType) {
      enhanced += ` [Party type: ${context.partyType}]`;
    }
    if (context?.location) {
      enhanced += ` [Location: ${context.location}]`;
    }
    
    return enhanced;
  }

  /**
   * Process and structure Biff's response
   */
  private processBiffResponse(rawResponse: string, userMessage: string): BiffResponse {
    // Extract suggested items if any
    const suggestedItems = this.extractSuggestedItems(rawResponse);
    
    // Generate party metrics based on the conversation
    const partyMetrics = this.generatePartyMetrics(userMessage);
    
    // Add random special effect occasionally
    const specialEffect = Math.random() > 0.7 ? this.getRandomSpecialEffect() : undefined;
    
    return {
      message: rawResponse,
      suggestedItems,
      partyMetrics,
      specialEffect
    };
  }

  /**
   * Extract product suggestions from response
   */
  private extractSuggestedItems(response: string): string[] {
    const items: string[] = [];
    
    // Look for patterns like "Atomic Margaritas" or "Wasteland Whiskey"
    const itemPattern = /(?:some|try|recommend|suggest|how about)\s+([A-Z][a-zA-Z\s-]+(?:Margaritas?|Whiskey|Beer|Vodka|Tequila|Wine|Cocktails?))/g;
    const matches = response.matchAll(itemPattern);
    
    for (const match of matches) {
      items.push(match[1].trim());
    }
    
    // Also look for items with apocalyptic modifiers
    const modifiedPattern = new RegExp(
      `(${BIFF_INVENTORY_MODIFIERS.prefixes.join('|')})\\s+([a-zA-Z\\s]+)`,
      'gi'
    );
    const modifiedMatches = response.matchAll(modifiedPattern);
    
    for (const match of modifiedMatches) {
      const item = `${match[1]} ${match[2]}`.trim();
      if (!items.includes(item)) {
        items.push(item);
      }
    }
    
    return items.slice(0, 5); // Limit to 5 suggestions
  }

  /**
   * Generate fun party metrics
   */
  private generatePartyMetrics(userMessage: string): BiffResponse['partyMetrics'] {
    // Base metrics
    let funLevel = 7;
    let yeehawFactor = 6;
    
    // Boost based on party size
    const sizeMatch = userMessage.match(/(\d+)\s*(?:people|guests|folks)/i);
    if (sizeMatch) {
      const size = parseInt(sizeMatch[1]);
      funLevel = Math.min(10, funLevel + Math.floor(size / 10));
      yeehawFactor = Math.min(10, yeehawFactor + Math.floor(size / 15));
    }
    
    // Boost for certain keywords
    if (/wedding|birthday|anniversary/i.test(userMessage)) funLevel += 1;
    if (/bachelor|bachelorette/i.test(userMessage)) yeehawFactor += 2;
    if (/boat|lake|pool/i.test(userMessage)) funLevel += 1;
    
    // Add some randomness
    funLevel = Math.min(10, Math.max(1, funLevel + Math.floor(Math.random() * 2 - 0.5)));
    yeehawFactor = Math.min(10, Math.max(1, yeehawFactor + Math.floor(Math.random() * 2 - 0.5)));
    
    return {
      funLevel,
      yeehawFactor,
      survivalChance: 100 // Always 100% because Biff ensures everyone survives to party another day
    };
  }

  /**
   * Get random special effect
   */
  private getRandomSpecialEffect(): string {
    const effects = [
      "*disco ball descends from the ceiling with sparks flying*",
      "*robotic line dance initiated*",
      "*party cannon fires biodegradable confetti*",
      "*holographic Texas flag appears*",
      "*Megabyte neighs approvingly in the distance*",
      "*emergency party lights activated*",
      "*ancient jukebox starts playing mysteriously*"
    ];
    
    return effects[Math.floor(Math.random() * effects.length)];
  }

  /**
   * Fallback response when API fails
   */
  private getFallbackResponse(): BiffResponse {
    const greeting = BIFF_RESPONSE_TEMPLATES.greetings[
      Math.floor(Math.random() * BIFF_RESPONSE_TEMPLATES.greetings.length)
    ];
    
    const signoff = BIFF_RESPONSE_TEMPLATES.signoffs[
      Math.floor(Math.random() * BIFF_RESPONSE_TEMPLATES.signoffs.length)
    ];
    
    const message = `${greeting} My circuits are a bit dusty from the wasteland winds, but I reckon I can help you throw one heck of a shindig! *beep boop* Whether you need supplies for 10 pardners or 100, I've got bunker-fresh party supplies ready to deploy. What kind of celebration are we planning today? ${signoff}`;
    
    return {
      message,
      partyMetrics: {
        funLevel: 8,
        yeehawFactor: 7,
        survivalChance: 100
      }
    };
  }
}

// Export singleton instance creator
export const createBiffAI = (apiKey: string) => new BiffAIService(apiKey);