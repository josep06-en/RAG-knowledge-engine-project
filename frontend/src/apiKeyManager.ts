/**
 * Secure API Key Management for BYOK (Bring Your Own Key) functionality
 * Stores API key only in localStorage, never sends to server
 */

export const API_KEY_STORAGE_KEY = 'rag_openai_api_key';

export interface ApiKeyManager {
  saveApiKey: (apiKey: string) => void;
  getApiKey: () => string | null;
  clearApiKey: () => void;
  validateApiKey: (apiKey: string) => { isValid: boolean; error: string };
}

export const apiKeyManager: ApiKeyManager = {
  /**
   * Save API key to localStorage
   */
  saveApiKey(apiKey: string): void {
    try {
      localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
      console.log('API key saved to localStorage');
    } catch (error) {
      console.error('Failed to save API key:', error);
    }
  },

  /**
   * Get API key from localStorage
   */
  getApiKey(): string | null {
    try {
      const apiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
      console.log('Retrieved API key from localStorage:', apiKey ? 'present' : 'not found');
      return apiKey;
    } catch (error) {
      console.error('Failed to get API key:', error);
      return null;
    }
  },

  /**
   * Clear API key from localStorage
   */
  clearApiKey(): void {
    try {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
      console.log('API key cleared from localStorage');
    } catch (error) {
      console.error('Failed to clear API key:', error);
    }
  },

  /**
   * Validate API key format
   */
  validateApiKey(apiKey: string): { isValid: boolean; error: string } {
    // Basic validation for OpenAI API keys
    if (!apiKey || apiKey.trim().length === 0) {
      return { isValid: false, error: 'API key is required' };
    }

    if (!apiKey.startsWith('sk-')) {
      return { isValid: false, error: 'API key must start with "sk-"' };
    }

    if (apiKey.length < 20) {
      return { isValid: false, error: 'API key appears to be too short' };
    }

    // Check for common invalid patterns
    const invalidPatterns = [
      'sk-disabled',
      'sk-test',
      'sk-example',
      'sk-invalid'
    ];

    if (invalidPatterns.some(pattern => apiKey.includes(pattern))) {
      return { isValid: false, error: 'API key appears to be invalid or disabled' };
    }

    return { isValid: true, error: '' };
  }
};
