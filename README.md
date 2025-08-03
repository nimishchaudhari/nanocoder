# Nanocoder

A local-first CLI coding agent that brings the power of agentic coding tools like Claude Code and Gemini CLI to local models or controlled APIs like OpenRouter. Built with privacy and control in mind, Nanocoder supports multiple AI providers with tool support for file operations and command execution.

## Installation

### For Users (Recommended)

Install globally and use anywhere:

```bash
npm install -g nanocoder
```

Then run in any directory:

```bash
nanocoder
```

### For Development

If you want to contribute or modify Nanocoder:

**Prerequisites:**

- Node.js 18+
- pnpm

**Setup:**

1. Clone and install dependencies:

```bash
git clone [repo-url]
cd nanocoder
pnpm install
```

2. Build the project:

```bash
pnpm run build
```

3. Run locally:

```bash
pnpm run start
```

Or build and run in one command:

```bash
pnpm run dev
```

## Configuration

### AI Provider Setup

**Option A: Ollama (Local AI)**

```bash
ollama pull qwen3:0.6b  # or any other model
```

**Option B: OpenRouter (Cloud AI)**

Create `agents.config.json` in your **working directory** (where you run `nanocoder`):

```json
{
  "nanocoder": {
    "openRouterApiKey": "your-api-key-here",
    "openRouterModels": ["foo-model", "bar-model"]
  }
}
```

> **Note**: The `agents.config.json` file should be placed in the directory where you run Nanocoder, allowing for project-by-project configuration with different models or API keys per repository.

### Commands

The CLI supports several built-in commands:

- `/help` - Show available commands
- `/clear` - Clear chat history
- `/model` - Switch between available models
- `/provider` - Switch between AI providers (ollama/openrouter)
- `/exit` - Exit the application

## Features

- **Multi-provider support**: Seamlessly switch between Ollama (local) and OpenRouter (cloud)
- **Smart fallback**: Automatically falls back to OpenRouter if Ollama is unavailable
- **Tool calling**: AI can execute tools to interact with your system
  - File reading and writing
  - Bash command execution
- **Interactive commands**: Built-in command system for managing the chat session
- **Colorised output**: Enhanced terminal experience with syntax highlighting
- **Model switching**: Change AI models on the fly

## License

MIT License

Copyright (c) 2025 Mote Software Ltd

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
