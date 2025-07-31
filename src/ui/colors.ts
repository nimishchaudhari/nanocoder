import chalk from "chalk";
import { colors } from "../config/index.js";

export const userColor = chalk.hex(colors.user).bold;
export const assistantColor = chalk.hex(colors.assistant).bold;
export const toolColor = chalk.hex(colors.tool).bold;
export const grayColor = chalk.gray;
