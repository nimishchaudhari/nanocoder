import { createLLMClient } from './dist/client-factory.js';

async function test() {
  try {
    console.log('Creating LLM client...');
    const { client, actualProvider } = await createLLMClient('openai-compatible');
    console.log(`Client created with provider: ${actualProvider}`);
    console.log(`Current model: ${client.getCurrentModel()}`);
    console.log(`Context size: ${client.getContextSize()}`);
    
    console.log('Testing chat stream...');
    const stream = client.chatStream([
      { role: 'user', content: 'Say "Hello, world!" and tell me what you can do.' }
    ], []);
    
    let chunkCount = 0;
    let contentChunks = 0;
    let emptyChunks = 0;
    let toolCallChunks = 0;
    
    for await (const chunk of stream) {
      chunkCount++;
      
      // Log the structure of the first few chunks to verify format
      if (chunkCount <= 5) {
        console.log(`Chunk ${chunkCount} structure:`, {
          hasMessage: !!chunk.message,
          hasContent: !!chunk.message?.content,
          contentLength: chunk.message?.content?.length || 0,
          hasToolCalls: !!chunk.message?.tool_calls,
          toolCallsLength: chunk.message?.tool_calls?.length || 0,
          hasDone: 'done' in chunk,
          doneValue: chunk.done
        });
      }
      
      // Count different types of chunks
      if (chunk.message?.content) {
        contentChunks++;
        if (chunk.message.content.length > 0) {
          console.log(`Content: "${chunk.message.content}"`);
        }
      } else {
        emptyChunks++;
      }
      
      if (chunk.message?.tool_calls && chunk.message.tool_calls.length > 0) {
        toolCallChunks++;
        console.log(`Tool calls:`, chunk.message.tool_calls);
      }
      
      // Check the expected properties exist
      if (!chunk.message) {
        console.log(`WARNING: Chunk ${chunkCount} missing message property`);
      }
      if (!('done' in chunk)) {
        console.log(`WARNING: Chunk ${chunkCount} missing done property`);
      }
    }
    
    console.log(`
Summary:`);
    console.log(`Total chunks: ${chunkCount}`);
    console.log(`Content chunks: ${contentChunks}`);
    console.log(`Empty chunks: ${emptyChunks}`);
    console.log(`Tool call chunks: ${toolCallChunks}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

test();