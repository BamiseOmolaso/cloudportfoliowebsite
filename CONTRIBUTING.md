# Contributing Guide

Thank you for your interest in contributing to this project! This document provides guidelines and instructions for contributing.

---

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect different viewpoints and experiences

---

## Getting Started

### 1. Fork and Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/awsportfoliowebsite.git
cd awsportfoliowebsite
```

### 2. Set Up Development Environment

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your local configuration

# Generate Prisma Client
npx prisma generate

# Run database migrations (if needed)
npx prisma migrate dev
```

### 3. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

---

## Development Workflow

### Running the Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your changes.

### Code Quality Checks

Before committing, ensure your code passes all checks:

```bash
# Run linting
npm run lint

# Run type checking
npm run type-check

# Run tests
npm test

# Run all pre-deployment checks
npm run predeploy
```

---

## Code Style Guidelines

### TypeScript

- Use TypeScript for all new code
- Avoid `any` types - use proper types or `unknown`
- Use interfaces for object shapes
- Use type aliases for unions and complex types

### Naming Conventions

- **Components**: PascalCase (e.g., `ContactForm.tsx`)
- **Functions/Variables**: camelCase (e.g., `handleSubmit`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)
- **Files**: Match the export (component files use PascalCase)

### Code Formatting

- Use Prettier for formatting (configured in the project)
- Run `npm run format` before committing
- Follow ESLint rules (no warnings/errors)

### File Organization

```
src/
├── app/              # Next.js app router pages
├── components/       # Reusable React components
├── lib/              # Utility functions
├── types/            # TypeScript type definitions
└── __tests__/        # Test files
```

---

## Testing Requirements

### Writing Tests

- Write tests for all new features
- Maintain or improve test coverage (target: 70%+)
- Test user behavior, not implementation details
- Use React Testing Library for components
- Mock external dependencies (APIs, database, etc.)

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

See [TESTING.md](./TESTING.md) for detailed testing guidelines.

---

## Commit Message Format

Use clear, descriptive commit messages:

```
type(scope): subject

body (optional)

footer (optional)
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat(contact): add email validation to contact form

fix(api): resolve rate limiting issue on newsletter endpoint

docs(readme): update installation instructions

test(components): add tests for ContactForm component
```

---

## Pull Request Process

### Before Submitting

1. **Update Documentation**: Update README.md or relevant docs if needed
2. **Add Tests**: Ensure new features have tests
3. **Run Checks**: All tests and linting must pass
4. **Update CHANGELOG**: Document your changes (if applicable)

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All tests pass locally
- [ ] No new warnings or errors
- [ ] TypeScript types are correct
- [ ] No console.logs in production code

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How was this tested?

## Screenshots (if applicable)
Add screenshots for UI changes

## Related Issues
Closes #issue-number
```

### Review Process

1. Submit your PR
2. Wait for CI/CD checks to pass
3. Address any review feedback
4. Once approved, maintainer will merge

---

## Project-Specific Guidelines

### Database Changes

- Use Prisma migrations for schema changes
- Test migrations on a local database first
- Document breaking changes in migration files

### API Routes

- Follow RESTful conventions
- Include input validation (Zod schemas)
- Add rate limiting where appropriate
- Include error handling
- Add authentication for protected routes

### Components

- Use TypeScript for props
- Make components reusable
- Follow accessibility best practices
- Use Tailwind CSS for styling
- Keep components focused and small

### Security

- Never commit secrets or API keys
- Sanitize all user inputs
- Use parameterized queries (Prisma handles this)
- Follow security best practices (see [SECURITY.md](./SECURITY.md))

---

## Getting Help

- **Documentation**: Check README.md and other docs
- **Issues**: Search existing issues before creating new ones
- **Discussions**: Use GitHub Discussions for questions
- **Contact**: Reach out to maintainers if needed

---

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project documentation

---

## Questions?

If you have questions about contributing, please:
1. Check existing documentation
2. Search closed issues/PRs
3. Open a discussion or issue

Thank you for contributing! 🎉

---

**Last Updated:** November 24, 2025

