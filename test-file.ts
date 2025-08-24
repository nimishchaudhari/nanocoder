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
 * Adds two numbers
 * @param a - The first number
 * @param b - The second number
 * @returns The sum of a and b
 */
export function add(a: number, b: number): number {
  return a + b;
}

/**
 * Multiplies two numbers
 * @param x - The first number to multiply
 * @param y - The second number to multiply
 * @returns The product of x and y
 */
export function multiply(x: number, y: number): number {
  return x * y;
}

// More functions to make a medium-sized file
/**
 * Subtracts two numbers
 * @param a - The first number
 * @param b - The second number to subtract
 * @returns The difference between a and b
 */
export function subtract(a: number, b: number): number {
  return a - b;
}
/**
 * Divides two numbers
 * @param a - The dividend
 * @param b - The divisor
 * @returns The quotient of a divided by b
 * @throws {Error} If divisor is zero
 */
export function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error("Division by zero");
  }
  return a / b;
}
/**
 * Raises a base to the power of an exponent
 * @param base - The base number
 * @param exponent - The exponent
 * @returns base raised to the power of exponent
 */
export function power(base: number, exponent: number): number {
  return Math.pow(base, exponent);
}
/**
 * Calculates the square root of a number
 * @param n - The number to calculate the square root of
 * @returns The square root of the number
 */
export function sqrt(n: number): number {
  return Math.sqrt(n);
}
/**
 * Returns the absolute value of a number
 * @param n - The number to get the absolute value of
 * @returns The absolute value of the number
 */
export function abs(n: number): number {
  return Math.abs(n);
}
/**
 * Rounds a number to the nearest integer
 * @param n - The number to round
 * @returns The rounded number
 */
export function round(n: number): number {
  return Math.round(n);
}
/**
 * Returns the largest integer less than or equal to a number
 * @param n - The number to floor
 * @returns The floored number
 */
export function floor(n: number): number {
  return Math.floor(n);
}
/**
 * Returns the smallest integer greater than or equal to a number
 * @param n - The number to ceil
 * @returns The ceiled number
 */
export function ceil(n: number): number {
  return Math.ceil(n);
}

// End of test file
