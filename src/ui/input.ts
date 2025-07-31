import * as readline from 'readline';
import { userColor } from './colors.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

export function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

export async function getUserInput(): Promise<string | null> {
  const userInput = await askQuestion(userColor('You: '));
  
  if (!userInput || userInput.toLowerCase() === 'exit') {
    console.log('Goodbye!');
    rl.close();
    return null;
  }
  
  return userInput;
}

export function closeInput(): void {
  rl.close();
}