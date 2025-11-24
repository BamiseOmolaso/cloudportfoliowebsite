import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Newsletter from '@/app/newsletter/page';

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
global.fetch = jest.fn() as jest.Mock;

describe('Newsletter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = 'test-site-key';
    (global.fetch as jest.Mock).mockClear();
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
    const user = userEvent.setup({ delay: null });
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
    await user.click(screen.getByRole('button', { name: /subscribe/i }));

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it('should show error for empty email', async () => {
    const user = userEvent.setup({ delay: null });
    render(<Newsletter />);

    await user.click(screen.getByRole('button', { name: /subscribe/i }));

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it('should successfully subscribe with valid email', async () => {
    const user = userEvent.setup({ delay: null });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<Newsletter />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'test@example.com');
    await user.click(screen.getByRole('button', { name: /subscribe/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/newsletter/subscribe', {
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
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

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
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<Newsletter />);

    const emailInput = screen.getByLabelText(/email/i);
    const nameInput = screen.getByLabelText(/name.*optional/i);

    await user.type(emailInput, 'test@example.com');
    await user.type(nameInput, 'John Doe');
    await user.click(screen.getByRole('button', { name: /subscribe/i }));

    await waitFor(() => {
      expect(emailInput).toHaveValue('');
      expect(nameInput).toHaveValue('');
    });
  });

  it('should show CAPTCHA when required', async () => {
    const user = userEvent.setup({ delay: null });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({
        error: 'Captcha verification required.',
        requiresCaptcha: true,
      }),
    });

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
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: 'Captcha verification required.',
        requiresCaptcha: true,
      }),
    });

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
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Captcha verification required.',
          requiresCaptcha: true,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

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
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Failed to subscribe' }),
    });

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
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

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
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true }),
      }), 100))
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
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<Newsletter />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'test@example.com');
    await user.click(screen.getByRole('button', { name: /subscribe/i }));

    await waitFor(() => {
      expect(screen.getByText(/an error occurred/i)).toBeInTheDocument();
    });
  });
});

