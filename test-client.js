import { createLLMClient } from './dist/client-factory.js';

// Simple test to verify the client works correctly
async function testClient() {
  try {
    console.log('Creating LLM client...');
    const { client, actualProvider } = await createLLMClient('openai-compatible');
    console.log(`Client created with provider: ${actualProvider}`);
    console.log(`Current model: ${client.getCurrentModel()}`);
    console.log(`Context size: ${client.getContextSize()}`);
    
    // Test non-streaming chat
    console.log('\nTesting non-streaming chat...');
    const response = await client.chat([
      { role: 'user', content: 'Hello! Please tell me what you can do in one sentence.' }
    ], []);
    
    console.log('Response:', response);
    
    // Test streaming
    console.log('\nTesting streaming...');
    const stream = client.chatStream([
      { role: 'user', content: 'List 3 programming languages in bullet points.' }
    ], []);
    
    for await (const chunk of stream) {
      if (chunk.message?.content) {
        process.stdout.write(chunk.message.content);
      }
    }
    console.log('\n\nStreaming test completed.');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testClient();