// import { resolve } from "node:path";
// import { readFile } from "node:fs/promises";
// import type { ToolHandler, ToolDefinition } from "../../types/index.js";
// import { toolColor, secondaryColor, primaryColor, errorColor } from "../../ui/colors.js";

// const handler: ToolHandler = async (args: {
//   paths: string[];
// }): Promise<string> => {
//   if (!Array.isArray(args.paths)) {
//     throw new Error("paths must be an array of strings");
//   }
//     const results = [] as { path: string; content: string }[];
//     for (const p of args.paths) {
//       try {
//         const content = await readFile(resolve(p), "utf-8");
//         const lines = content.split('\n');

//         // Add line numbers for precise editing
//         let numberedContent = '';
//         for (let i = 0; i < lines.length; i++) {
//           const lineNum = String(i + 1).padStart(4, ' ');
//           numberedContent += `${lineNum}: ${lines[i]}\n`;
//         }

//         results.push({ path: p, content: numberedContent.slice(0, -1) });
//       } catch (err) {
//         results.push({
//           path: p,
//           content: `Error reading file: ${
//             err instanceof Error ? err.message : String(err)
//           }`,
//         });
//       }
//     }
//     return JSON.stringify(results);
// };

// const formatter = (args: any): string => {
//   const paths = args.paths || [];
//   let result = `${toolColor('⚒ read_many_files')}\n`;

//   if (!Array.isArray(paths)) {
//     result += `${errorColor('Error:')} paths must be an array`;
//     return result;
//   }

//   result += `${secondaryColor('Files:')} ${primaryColor(paths.length)} file${paths.length !== 1 ? 's' : ''}\n`;

//   const maxPreview = 5;
//   const previewPaths = paths.slice(0, maxPreview);

//   for (const path of previewPaths) {
//     result += `${secondaryColor('  •')} ${primaryColor(path)}\n`;
//   }

//   if (paths.length > maxPreview) {
//     result += `${secondaryColor('  ... and ' + (paths.length - maxPreview) + ' more files')}\n`;
//   }

//   return result.slice(0, -1);
// };

// export const readManyFilesTool: ToolDefinition = {
//   handler,
//   formatter,
//   config: {
//     type: "function",
//     function: {
//       name: "read_many_files",
//       description: "Read the contents of multiple files with line numbers. Returns a JSON array of { path, content } in the same order as provided.",
//       parameters: {
//         type: "object",
//         properties: {
//           paths: {
//             type: "array",
//             items: { type: "string" },
//             description: "Array of file paths to read, in order.",
//           },
//         },
//         required: ["paths"],
//       },
//     },
//   },
// };
