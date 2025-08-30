import { createLLMClient } from './dist/client-factory.js';

async function test() {
  try {
    console.log('Creating LLM client...');
    const { client, actualProvider } = await createLLMClient('openai-compatible');
    console.log(`Client created with provider: ${actualProvider}`);
    console.log(`Current model: ${client.getCurrentModel()}`);
    console.log(`Context size: ${client.getContextSize()}`);
    
    console.log('Testing chat...');
    const response = await client.chat([
      { role: 'user', content: 'Hello, world!' }
    ], []);
    
    console.log('Response:', response);
  } catch (error) {
    console.error('Error:', error);
  }
}

test();