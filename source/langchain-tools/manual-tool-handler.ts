import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";

export class ManualToolHandler {
  static async executeWithManualToolCalling(
    model: BaseChatModel,
    messages: any[],
    tools: any[]
  ): Promise<any> {
    // Create tool description prompt
    const toolDescriptions = tools.map(tool => 
      `${tool.function.name}: ${tool.function.description}\nParameters: ${JSON.stringify(tool.function.parameters)}`
    ).join('\n\n');

    const toolPrompt = `You have access to the following tools:\n${toolDescriptions}\n\n` +
      `To use a tool, respond ONLY with a JSON object in this exact format:\n` +
      `{"tool_call": {"name": "tool_name", "arguments": {"param1": "value1"}}}\n\n` +
      `If you don't need to use any tools, respond normally to the user's request.`;

    // Add tool prompt to messages
    const enhancedMessages = [
      ...messages,
      new SystemMessage(toolPrompt)
    ];

    // Get initial response
    const response = await model.invoke(enhancedMessages);

    // Check if response contains tool call
    try {
      // Handle different response types
      const content = response.content ? response.content.toString() : response.toString();
      const parsedResponse = JSON.parse(content);
      if (parsedResponse.tool_call) {
        // Extract tool call and execute (this would integrate with your existing tool system)
        return await this.handleToolCall(model, messages, parsedResponse.tool_call, tools);
      }
    } catch (e) {
      // Not a tool call, return normal response
    }

    return response;
  }

  private static async handleToolCall(
    model: BaseChatModel,
    originalMessages: any[],
    toolCall: any,
    tools: any[]
  ): Promise<any> {
    // Find the tool in the tools array
    const tool = tools.find(t => t.function.name === toolCall.name);
    
    if (!tool) {
      const toolResult = `Tool "${toolCall.name}" not found`;
      
      // Send tool result back to model
      const finalMessages = [
        ...originalMessages,
        new HumanMessage(`Tool result: ${toolResult}`)
      ];

      return await model.invoke(finalMessages);
    }
    
    // Format the tool call properly (args should be a JSON string)
    let args = toolCall.arguments;
    if (typeof args === 'string') {
      try {
        args = JSON.parse(args);
      } catch (e) {
        // If parsing fails, keep as string
      }
    }
    
    // Create a proper tool result format
    const toolResult = {
      name: toolCall.name,
      content: `Tool ${toolCall.name} executed with args: ${JSON.stringify(args)}`,
      tool_call_id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    // Send tool result back to model
    const finalMessages = [
      ...originalMessages,
      new HumanMessage(`Tool result: ${toolResult.content}`)
    ];

    return await model.invoke(finalMessages);
  }
}