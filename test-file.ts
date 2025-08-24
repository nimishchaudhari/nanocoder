// A simple file to give to models to test Nanocoder's functionality

export function greet(name: string): string {
  return `Hello ${name}!`;
}

export function add(a: number, b: number): number {
  return a + b;
}

export function multiply(x: number, y: number): number {
  return x * y;
}

// More functions to make a medium-sized file
/**
 * Subtract one number from another
 * @param a - The number to subtract from
 * @param b - The number to subtract
 * @returns The difference of a and b
 */
export function subtract(a: number, b: number): number {
  return a - b;
}

/**
 * Divide one number by another
 * @param a - The dividend
 * @param b - The divisor
 * @returns The quotient of a and b
 * @throws Error if b is zero
 */
export function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error("Division by zero");
  }
  return a / b;
}

/**
 * Raise a number to the power of another number
 * @param base - The base number
 * @param exponent - The exponent
 * @returns The result of base raised to the power of exponent
 */
export function power(base: number, exponent: number): number {
  return Math.pow(base, exponent);
}

/**
 * Calculate the square root of a number
 * @param n - The number to calculate the square root of
 * @returns The square root of n
 */
export function sqrt(n: number): number {
  return Math.sqrt(n);
}

/**
 * Calculate the absolute value of a number
 * @param n - The number to calculate the absolute value of
 * @returns The absolute value of n
 */
export function abs(n: number): number {
  return Math.abs(n);
}

/**
 * Round a number to the nearest integer
 * @param n - The number to round
 * @returns The rounded value of n
 */
export function round(n: number): number {
  return Math.round(n);
}

/**
 * Round a number down to the nearest integer
 * @param n - The number to round down
 * @returns The floor value of n
 */
export function floor(n: number): number {
  return Math.floor(n);
}

/**
 * Round a number up to the nearest integer
 * @param n - The number to round up
 * @returns The ceiling value of n
 */
export function ceil(n: number): number {
  return Math.ceil(n);
}

// End of test file
