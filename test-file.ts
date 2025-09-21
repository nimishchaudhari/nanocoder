// A simple file to give to models to test Nanocoder's functionality

/**
 * Greets a person by name
 * @param name - The name of the person to greet
 * @returns A greeting string
 */
export function greet(name: string): string {
  return `Hello ${name}!`;
}

/**
 * Adds two numbers together
 * @param a - The first number
 * @param b - The second number
 * @returns The sum of a and b
 */
export function add(a: number, b: number): number {
  return a + b;
}
/**
 * Multiplies two numbers together
 * @param x - The first number
 * @param y - The second number
 * @returns The product of x and y
 */

export function multiply(x: number, y: number): number {
  return x * y;
}

// More functions to make a medium-sized file

/**
 * Subtracts the second number from the first number
 * @param a - The number to subtract from
 * @param b - The number to subtract
 * @returns The difference of a and b
 */
export function subtract(a: number, b: number): number {
  return a - b;
}

export function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error("Division by zero");
  }
  return a / b;
}

export function power(base: number, exponent: number): number {
  return Math.pow(base, exponent);
}

export function sqrt(n: number): number {
  return Math.sqrt(n);
}

export function abs(n: number): number {
  return Math.abs(n);
}

export function round(n: number): number {
  return Math.round(n);
}

export function floor(n: number): number {
  return Math.floor(n);
}

/**
 * Rounds a number up to the nearest integer
 * @param n - The number to round up
 * @returns The smallest integer greater than or equal to n
 */
export function ceil(n: number): number {
  return Math.ceil(n);
}

// End of test file