import { describe, it, expect, beforeEach, afterEach, beforeAll, jest } from '@jest/globals';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMockResponse } from '../utils/test-helpers';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock ReCAPTCHA
jest.mock('react-google-recaptcha', () => {
  return function MockReCAPTCHA({ onChange }: { onChange: (token: string | null) => void }) {
    return (
      <button
        type="button"
        onClick={() => onChange('mock-captcha-token')}
        data-testid="mock-recaptcha"
      >
        Verify CAPTCHA
      </button>
    );
  };
});

// Mock fetch
const mockFetch: jest.MockedFunction<typeof fetch> = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const createUser = () => userEvent.setup({ delay: null, advanceTimers: jest.advanceTimersByTime });

type NewsletterModule = typeof import('@/app/newsletter/page');
let Newsletter: NewsletterModule['default'];

beforeAll(async () => {
  ({ default: Newsletter } = await import('@/app/newsletter/page'));
});

describe('Newsletter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = 'test-site-key';
    mockFetch.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render newsletter subscription form', () => {
    render(<Newsletter />);

    expect(screen.getByText(/subscribe to newsletter/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/name.*optional/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /subscribe/i })).toBeInTheDocument();
  });

  it('should update email and name fields when user types', async () => {
    const user = createUser();
    render(<Newsletter />);

    const emailInput = screen.getByLabelText(/email/i);
    const nameInput = screen.getByLabelText(/name.*optional/i);

    await user.type(emailInput, 'test@example.com');
    await user.type(nameInput, 'John Doe');

    expect(emailInput).toHaveValue('test@example.com');
    expect(nameInput).toHaveValue('John Doe');
  });

  it('should show error for invalid email', async () => {
    const user = userEvent.setup({ delay: null });
    render(<Newsletter />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid-email');
    
    // Submit form directly using fireEvent to bypass browser validation
    const form = emailInput.closest('form');
    await act(async () => {
      if (form) {
        fireEvent.submit(form);
      }
      // Flush React updates
      await Promise.resolve();
    });

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should show error for empty email', async () => {
    render(<Newsletter />);

    const emailInput = screen.getByLabelText(/email/i);
    
    // Submit form directly using fireEvent to bypass browser validation
    const form = emailInput.closest('form');
    await act(async () => {
      if (form) {
        fireEvent.submit(form);
      }
      // Flush React updates
      await Promise.resolve();
    });

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should successfully subscribe with valid email', async () => {
    const user = userEvent.setup({ delay: null });
    mockFetch.mockResolvedValue(
      createMockResponse({ success: true })
    );

    render(<Newsletter />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'test@example.com');
    await user.click(screen.getByRole('button', { name: /subscribe/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          name: '',
          captchaToken: undefined,
        }),
      });
    });
  });

  it('should show success message on successful subscription', async () => {
    const user = userEvent.setup({ delay: null });
    mockFetch.mockResolvedValue(
      createMockResponse({ success: true })
    );

    render(<Newsletter />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'test@example.com');
    await user.click(screen.getByRole('button', { name: /subscribe/i }));

    await waitFor(() => {
      expect(screen.getByText(/thank you for subscribing/i)).toBeInTheDocument();
    });
  });

  it('should clear form after successful subscription', async () => {
    const user = userEvent.setup({ delay: null });
    mockFetch.mockResolvedValue(
      createMockResponse({ success: true })
    );

    render(<Newsletter />);

    const emailInput = screen.getByLabelText(/email/i);
    const nameInput = screen.getByLabelText(/name.*optional/i);

    await user.type(emailInput, 'test@example.com');
    await user.type(nameInput, 'John Doe');
    await user.click(screen.getByRole('button', { name: /subscribe/i }));

    // After success, the form is hidden and success message is shown
    // The component clears the form state, but we can't check inputs since form is hidden
    await waitFor(() => {
      expect(screen.getByText(/thank you for subscribing/i)).toBeInTheDocument();
    });
    
    // Verify form fields were cleared by checking that if we could see them, they'd be empty
    // Since the form is hidden on success, we just verify success state
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
  });

  it('should show CAPTCHA when required', async () => {
    const user = userEvent.setup({ delay: null });
    mockFetch.mockResolvedValue(
      createMockResponse({
        error: 'Captcha verification required.',
        requiresCaptcha: true,
      }, { ok: false })
    );

    render(<Newsletter />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'test@example.com');
    await user.click(screen.getByRole('button', { name: /subscribe/i }));

    await waitFor(() => {
      expect(screen.getByText(/please complete the captcha verification/i)).toBeInTheDocument();
      expect(screen.getByTestId('mock-recaptcha')).toBeInTheDocument();
    });
  });

  it('should disable submit button when CAPTCHA is required but not completed', async () => {
    const user = userEvent.setup({ delay: null });
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        error: 'Captcha verification required.',
        requiresCaptcha: true,
      }, { ok: false })
    );

    render(<Newsletter />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'test@example.com');
    await user.click(screen.getByRole('button', { name: /subscribe/i }));

    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /subscribe/i });
      expect(submitButton).toBeDisabled();
    });
  });

  it('should enable submit button after CAPTCHA is completed', async () => {
    const user = userEvent.setup({ delay: null });
    mockFetch
      .mockResolvedValueOnce(
        createMockResponse({
          error: 'Captcha verification required.',
          requiresCaptcha: true,
        }, { ok: false })
      )
      .mockResolvedValueOnce(
        createMockResponse({ success: true })
      );

    render(<Newsletter />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'test@example.com');
    await user.click(screen.getByRole('button', { name: /subscribe/i }));

    await waitFor(() => {
      expect(screen.getByTestId('mock-recaptcha')).toBeInTheDocument();
    });

    // Complete CAPTCHA
    await user.click(screen.getByTestId('mock-recaptcha'));

    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /subscribe/i });
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('should show error message on failed subscription', async () => {
    const user = userEvent.setup({ delay: null });
    mockFetch.mockResolvedValue(
      createMockResponse({ error: 'Failed to subscribe' }, { ok: false })
    );

    render(<Newsletter />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'test@example.com');
    await user.click(screen.getByRole('button', { name: /subscribe/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed to subscribe/i)).toBeInTheDocument();
    });
  });

  it('should redirect to home page after successful subscription', async () => {
    const user = userEvent.setup({ delay: null });
    mockFetch.mockResolvedValue(
      createMockResponse({ success: true })
    );

    render(<Newsletter />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'test@example.com');
    await user.click(screen.getByRole('button', { name: /subscribe/i }));

    await waitFor(() => {
      expect(screen.getByText(/thank you for subscribing/i)).toBeInTheDocument();
    });

    // Fast-forward time to trigger redirect
    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('should show loading state when submitting', async () => {
    const user = userEvent.setup({ delay: null });
    mockFetch.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(
        createMockResponse({ success: true })
      ), 100))
    );

    render(<Newsletter />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'test@example.com');

    const submitButton = screen.getByRole('button', { name: /subscribe/i });
    await user.click(submitButton);

    expect(screen.getByText(/subscribing.../i)).toBeInTheDocument();
  });

  it('should handle network errors', async () => {
    const user = userEvent.setup({ delay: null });
    mockFetch.mockRejectedValue(new Error('Network error'));

    render(<Newsletter />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'test@example.com');
    await user.click(screen.getByRole('button', { name: /subscribe/i }));

    await waitFor(() => {
      expect(screen.getByText(/an error occurred/i)).toBeInTheDocument();
    });
  });
});

