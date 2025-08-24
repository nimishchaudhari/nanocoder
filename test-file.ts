// A simple file to give to models to test Nanocoder's functionality

/**
 * Greets a person by name
 * @param name - The name of the person to greet
 * @returns A greeting message
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
 * Multiplies two numbers
 * @param x - The first number
 * @param y - The second number
 * @returns The product of x and y
 */
export function multiply(x: number, y: number): number {
  return x * y;
}

// More functions to make a medium-sized file

/**
 * Subtracts one number from another
 * @param a - The number to subtract from
 * @param b - The number to subtract
 * @returns The result of a minus b
 */
export function subtract(a: number, b: number): number {
  return a - b;
}

/**
 * Divides one number by another
 * @param a - The dividend
 * @param b - The divisor
 * @returns The result of a divided by b
 * @throws Error if attempting to divide by zero
 */
export function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error("Division by zero");
  }
  return a / b;
}

/**
 * Raises a base number to a power
 * @param base - The base number
 * @param exponent - The exponent
 * @returns The result of base raised to the exponent
 */
export function power(base: number, exponent: number): number {
  return Math.pow(base, exponent);
}

/**
 * Calculates the square root of a number
 * @param n - The number to calculate square root for
 * @returns The square root of n
 */
export function sqrt(n: number): number {
  return Math.sqrt(n);
}

/**
 * Returns the absolute value of a number
 * @param n - The number
 * @returns The absolute value of n
 */
export function abs(n: number): number {
  return Math.abs(n);
}

/**
 * Rounds a number to the nearest integer
 * @param n - The number to round
 * @returns The rounded integer
 */
export function round(n: number): number {
  return Math.round(n);
}

/**
 * Rounds a number down to the nearest integer
 * @param n - The number to round down
 * @returns The largest integer less than or equal to n
 */
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

// End of test file