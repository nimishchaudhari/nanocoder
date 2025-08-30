export class ContextDetector {
  static async detectContextWindow(baseUrl: string, model: string, apiKey?: string): Promise<number> {
    try {
      // Try to fetch model info from /v1/models endpoint
      const modelsResponse = await this.fetchModels(baseUrl, apiKey);
      if (modelsResponse) {
        const contextSize = this.extractContextFromModels(modelsResponse, model);
        if (contextSize) return contextSize;
      }
    } catch (error) {
      // Silently continue to estimation
    }
    
    // Fallback to estimation based on model name
    return this.estimateContextFromName(model);
  }

  private static async fetchModels(baseUrl: string, apiKey?: string): Promise<any> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(`${baseUrl}/v1/models`, { headers });
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      // Silently fail
    }
    return null;
  }

  private static extractContextFromModels(modelsData: any, modelName: string): number | null {
    if (!modelsData?.data) return null;
    
    // Look for the specific model
    const model = modelsData.data.find((m: any) => 
      m.id === modelName || m.name === modelName
    );
    
    if (model?.context_length) {
      return model.context_length;
    }
    
    if (model?.max_context_length) {
      return model.max_context_length;
    }
    
    return null;
  }

  private static estimateContextFromName(modelName: string): number {
    const modelContextMap: Record<string, number> = {
      // GPT models
      'gpt-3.5-turbo': 16385,
      'gpt-4': 8192,
      'gpt-4-turbo': 128000,
      'gpt-4o': 128000,
      
      // Llama models
      'llama3': 8192,
      'llama2': 4096,
      'mistral': 32768,
      'mixtral': 32768,
      
      // Default fallback
      'default': 4096
    };

    // Exact match
    if (modelContextMap[modelName]) {
      return modelContextMap[modelName];
    }

    // Partial match
    for (const [key, value] of Object.entries(modelContextMap)) {
      if (modelName.includes(key)) {
        return value;
      }
    }

    return 4096; // Safe default
  }
}