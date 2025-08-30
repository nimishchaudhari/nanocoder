export class ToolDetector {
  static supportsNativeToolCalling(provider: string, model: string): boolean {
    // For OpenRouter, most models support tool calling
    if (provider === 'openrouter') return true;
    
    // For OpenAI-compatible APIs (including Ollama), assume tool calling support
    // since they're using the OpenAI format through LangChain
    if (provider === 'openai-compatible') return true;
    
    // Known models that support native tool calling
    const nativeSupport = [
      'gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o',
      'llama3', 'mistral', 'mixtral', 'qwen'
    ];
    
    return nativeSupport.some(supportedModel => model.includes(supportedModel));
  }
}