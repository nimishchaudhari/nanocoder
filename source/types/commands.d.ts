export interface Command {
    name: string;
    description: string;
    handler: (args: string[]) => void;
}
export interface ParsedCommand {
    isCommand: boolean;
    command?: string;
    args?: string[];
    fullCommand?: string;
}
export interface CustomCommandMetadata {
    description?: string;
    aliases?: string[];
    parameters?: string[];
}
export interface CustomCommand {
    name: string;
    path: string;
    namespace?: string;
    fullName: string;
    metadata: CustomCommandMetadata;
    content: string;
}
export interface ParsedCustomCommand {
    metadata: CustomCommandMetadata;
    content: string;
}
//# sourceMappingURL=commands.d.ts.map