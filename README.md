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
