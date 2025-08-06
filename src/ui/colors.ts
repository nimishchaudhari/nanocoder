import chalk from "chalk";
import { colors } from "../config/index.js";

export const whiteColor = chalk.hex(colors.white).bold;
export const primaryColor = chalk.hex(colors.primary).bold;
export const toolColor = chalk.hex(colors.tool).bold;
export const secondaryColor = chalk.hex(colors.secondary);
export const successColor = chalk.hex(colors.success).bold;
export const errorColor = chalk.hex(colors.error).bold;
export const blueColor = chalk.hex(colors.blue).bold;
export const orangeColor = chalk.hex(colors.orange).bold;

// Background colors for diff lines
export const addedLineColor = chalk.hex(colors.success).bgHex('#0d5d0d').bold;
export const removedLineColor = chalk.hex(colors.error).bgHex('#5d0d0d').bold;
