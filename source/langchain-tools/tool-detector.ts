export class ToolDetector {
  static supportsNativeToolCalling(provider: string, model: string): boolean {
    // Known models that support native tool calling
    const nativeSupport = [
      'gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o',
      'llama3', 'mistral', 'mixtral'
    ];
    
    // For OpenRouter, most models support tool calling
    if (provider === 'openrouter') return true;
    
    return nativeSupport.some(supportedModel => model.includes(supportedModel));
  }
}