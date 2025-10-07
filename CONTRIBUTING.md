# Contributing to Nanocoder

Thank you for your interest in contributing to Nanocoder! We welcome contributions from developers of all skill levels. This guide will help you get started with contributing to the project.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Coding Standards](#coding-standards)
- [Submitting Changes](#submitting-changes)
- [Issue Guidelines](#issue-guidelines)
- [Community and Communication](#community-and-communication)

## Getting Started

Before contributing, please:

1. Read our [README](README.md) to understand what Nanocoder does
2. Check our [issue tracker](https://github.com/Nano-Collective/nanocoder/issues) for existing issues
3. Look for issues labeled `good first issue` or `help wanted` if you're new to the project

## Development Setup

### Prerequisites

- Node.js 18+
- npm or pnpm
- Git

### Setup Steps

1. **Fork and clone the repository:**

   ```bash
   git clone https://github.com/YOUR-USERNAME/nanocoder.git
   cd nanocoder
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Build the project:**

   ```bash
   npm run build
   ```

4. **Test your setup:**

   ```bash
   npm run start
   ```

5. **For development with auto-rebuild:**
   ```bash
   npm run dev
   ```

## Making Changes

### Types of Contributions

1. **Bug Fixes**: Address existing issues or problems
2. **New Features**: Add functionality (new AI providers, tools, commands)
3. **Improvements**: Enhance existing features or performance
4. **Documentation**: Improve README, comments, or guides
5. **Testing**: Add or improve tests
6. **Model Cards**: For our recommendations database

### Development Workflow

1. **Create a branch:**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes:**

   - Follow the existing code style
   - Add appropriate TypeScript types
   - Update documentation if needed

3. **Test your changes:**

   ```bash
   npm run build
   npm run start
   ```

4. **Commit your changes:**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

### Commit Message Convention

We follow conventional commits:

- `feat:` - New features
- `mod:` – Smaller modifications to existing features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Adding or modifying tests
- `chore:` - Build process or auxiliary tool changes

## Testing

### Manual Testing

Since Nanocoder is a CLI tool, most testing is currently manual:

1. **Test different AI providers:**

   - Ollama (local)
   - OpenRouter (API)
   - OpenAI-compatible endpoints

2. **Test core functionality:**

   - File operations (read, write, edit)
   - Bash command execution
   - Custom commands
   - MCP server integration

3. **Test error scenarios:**
   - Network failures
   - Invalid configurations
   - Missing dependencies

### Adding Tests

We welcome contributions that add automated testing:

- Unit tests for core functions
- Integration tests for AI providers
- CLI interaction tests

## Coding Standards

### TypeScript Guidelines

- **Strict Mode**: The project uses strict TypeScript settings
- **Types First**: Always define proper TypeScript types
- **No `any`**: Avoid using `any` type; use proper type definitions
- **ESNext**: Use modern JavaScript/TypeScript features

### Code Style

- **Formatting**: Code is auto-formatted (maintain existing style)
- **Naming**: Use descriptive variable and function names
- **Comments**: Add comments for complex logic, not obvious code
- **Error Handling**: Always handle errors gracefully

### File Organization

- **Imports**: Group external imports, then internal imports
- **Exports**: Use named exports; avoid default exports where possible
- **Modules**: Keep files focused on a single responsibility

## Submitting Changes

### Pull Request Process

1. **Update Documentation**: If your change affects user-facing behavior
2. **Test Thoroughly**: Ensure your changes work across different scenarios
3. **Create Pull Request**: With a clear title and description

### Pull Request Template

```markdown
## Description

Brief description of what this PR does

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Tested with Ollama
- [ ] Tested with OpenRouter
- [ ] Tested with OpenAI-compatible API
- [ ] Tested MCP integration (if applicable)

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated (if needed)
- [ ] No breaking changes (or clearly documented)
```

### Review Process

- Maintainers will review your PR
- Address feedback promptly
- Be open to suggestions and changes
- Once approved, we'll merge your contribution

## Issue Guidelines

### Reporting Bugs

When reporting bugs, please include:

- **Environment**: OS, Node.js version, Nanocoder version
- **AI Provider**: Which provider you were using
- **Configuration**: Relevant config (sanitize API keys)
- **Steps to Reproduce**: Clear, step-by-step instructions
- **Expected vs Actual**: What should happen vs what actually happens
- **Logs**: Any relevant error messages or debug output

### Requesting Features

For feature requests:

- **Use Case**: Explain why this feature would be useful
- **Proposed Solution**: If you have ideas on implementation
- **Alternatives**: Other ways you've considered solving this
- **Additional Context**: Screenshots, examples, or references

### Issue Labels

- `bug` - Something isn't working
- `enhancement` - New feature or improvement
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `documentation` - Documentation improvements
- `question` - Questions or discussions

## Community and Communication

### Getting Help

- **GitHub Issues**: For bugs, features, and questions
- **Discord Server**: Join our community Discord server for real-time discussions, help, and collaboration: [Join our Discord server](https://discord.gg/ktPDV6rekE)

### Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help create a welcoming environment for all contributors
- Remember that everyone is learning and contributing voluntarily

### Recognition

All contributors are recognized in the project. We appreciate:

- Code contributions
- Bug reports and testing
- Documentation improvements
- Feature suggestions and feedback
- Community support and discussions

## Development Tips

### Working with AI Providers

- Test with multiple providers to ensure compatibility
- Handle API failures gracefully
- Respect rate limits and API quotas

### Tool Development

- New tools should implement the common tool interface
- Always validate inputs and handle errors
- Document tool capabilities clearly

### MCP Integration

- Follow MCP protocol specifications
- Test with real MCP servers
- Handle connection failures properly

### UI/UX Considerations

- Maintain consistent CLI interface
- Provide clear feedback to users
- Handle long-running operations gracefully

---

Thank you for contributing to Nanocoder! Your efforts help make local-first AI coding tools more accessible and powerful for everyone.
