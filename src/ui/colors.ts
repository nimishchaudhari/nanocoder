import chalk from "chalk";
import { colors } from "../config/index.js";

export const whiteColor = chalk.hex(colors.white);
export const blackColor = chalk.hex(colors.black);
export const primaryColor = chalk.hex(colors.primary);
export const toolColor = chalk.hex(colors.tool);
export const secondaryColor = chalk.hex(colors.secondary);
export const successColor = chalk.hex(colors.success);
export const successColorBg = chalk.hex(colors.black).bgHex(colors.success);
export const errorColor = chalk.hex(colors.error);
export const blueColor = chalk.hex(colors.blue);
export const blueColorBg = chalk.hex(colors.black).bgHex(colors.blue);
export const orangeColor = chalk.hex(colors.orange);

// Background colors for diff lines
export const addedLineColor = chalk.hex(colors.success).bgHex("#0d5d0d").bold;
export const removedLineColor = chalk.hex(colors.error).bgHex("#5d0d0d").bold;
