/**
 * Email service tests
 * Tests for transactional email functionality using Resend
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Import after mocking
import { sendEmail, EmailTemplate, isEmailConfigured } from '../server/_core/email';
import { Resend } from 'resend';

// Mock Resend before importing email service
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ data: { id: 'test-email-id' }, error: null }),
    },
  })),
}));

describe('email service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up env vars for testing
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.EMAIL_FROM_ADDRESS = 'Test <test@example.com>';
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM_ADDRESS;
    delete process.env.EMAIL_REPLY_TO;
  });

  describe('isEmailConfigured', () => {
    it('returns true when RESEND_API_KEY is set', () => {
      process.env.RESEND_API_KEY = 're_test_key';
      expect(isEmailConfigured()).toBe(true);
    });

    it('returns false when RESEND_API_KEY is not set', () => {
      delete process.env.RESEND_API_KEY;
      expect(isEmailConfigured()).toBe(false);
    });
  });

  describe('sendEmail', () => {
    it('sends email with correct parameters', async () => {
      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Welcome to Protocol Guide',
        template: EmailTemplate.WELCOME,
        data: { name: 'Test User' },
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe('test-email-id');
    });

    it('returns success false when API key is not configured', async () => {
      delete process.env.RESEND_API_KEY;

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Welcome',
        template: EmailTemplate.WELCOME,
        data: { name: 'Test User' },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });

    it('handles send failures gracefully', async () => {
      // Override mock to simulate failure
      const mockResend = vi.mocked(Resend);
      mockResend.mockImplementationOnce(() => ({
        emails: {
          send: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'API Error', name: 'api_error' }
          }),
        },
      }) as unknown as InstanceType<typeof Resend>);

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        template: EmailTemplate.WELCOME,
        data: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('handles network errors gracefully', async () => {
      const mockResend = vi.mocked(Resend);
      mockResend.mockImplementationOnce(() => ({
        emails: {
          send: vi.fn().mockRejectedValue(new Error('Network error')),
        },
      }) as unknown as InstanceType<typeof Resend>);

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        template: EmailTemplate.WELCOME,
        data: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('includes reply-to when configured', async () => {
      process.env.EMAIL_REPLY_TO = 'support@example.com';

      await sendEmail({
        to: 'user@example.com',
        subject: 'Welcome',
        template: EmailTemplate.WELCOME,
        data: { name: 'Test' },
      });

      // Verify Resend was called with replyTo
      const mockResendInstance = vi.mocked(Resend).mock.results[0]?.value;
      if (mockResendInstance) {
        expect(mockResendInstance.emails.send).toHaveBeenCalledWith(
          expect.objectContaining({
            replyTo: 'support@example.com',
          })
        );
      }
    });
  });

  describe('EmailTemplate enum', () => {
    it('has all required templates', () => {
      expect(EmailTemplate.WELCOME).toBe('welcome');
      expect(EmailTemplate.TIER_UPGRADE).toBe('tierUpgrade');
      expect(EmailTemplate.SUBSCRIPTION_CANCELED).toBe('subscriptionCanceled');
      expect(EmailTemplate.ONBOARDING_TIPS).toBe('onboardingTips');
      expect(EmailTemplate.ONBOARDING_PRO_PITCH).toBe('onboardingProPitch');
    });
  });
});
