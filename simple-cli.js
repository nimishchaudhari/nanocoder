#!/usr/bin/env node
import { createLLMClient } from './dist/client-factory.js';
import readline from 'readline';

// Simple non-interactive CLI version of Nanocoder
async function main() {
  console.log('Nanocoder - Non-Interactive Mode');
  console.log('=================================');
  
  try {
    // Create the LLM client
    const { client, actualProvider } = await createLLMClient('openai-compatible');
    console.log(`Connected to: ${actualProvider} (${client.getCurrentModel()})`);
    console.log(`Context size: ${client.getContextSize()} tokens`);
    console.log('');
    
    // Simple conversation loop
    console.log('Enter your messages (type "exit" to quit):');
    
    // Since we can't use Ink's raw mode in this environment,
    // we'll use a simple readline interface for testing
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const conversationLoop = () => {
      rl.question('> ', async (input) => {
        if (input.toLowerCase() === 'exit') {
          console.log('Goodbye!');
          rl.close();
          return;
        }
        
        if (input.trim()) {
          try {
            console.log('\nAI: ');
            const stream = client.chatStream([
              { role: 'user', content: input }
            ], []);
            
            for await (const chunk of stream) {
              if (chunk.message?.content) {
                process.stdout.write(chunk.message.content);
              }
            }
            console.log('\n');
          } catch (error) {
            console.error('Error:', error.message);
          }
        }
        
        conversationLoop();
      });
    };
    
    conversationLoop();
    
  } catch (error) {
    console.error('Failed to initialize LLM client:', error.message);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (process.argv[1] === import.meta.url) {
  main().catch(console.error);
}

// For direct execution
main().catch(console.error);