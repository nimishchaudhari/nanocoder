# nano-ollama-code

A simple CLI chat interface that uses Ollama for local AI interactions with tool support.

## Prerequisites

- [Ollama](https://ollama.ai/) running locally
- Node.js 18+
- pnpm

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Make sure Ollama is running and has a model pulled:

```bash
ollama pull [model]
```

3. Build the project:

```bash
pnpm run build
```

## Usage

Run the chat interface:

```bash
pnpm run start
```

Or build and run in one command:

```bash
pnpm run dev
```

## Features

- Interactive chat with Ollama models
- File reading/writing tools
- Bash command execution
- Colorized output

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
