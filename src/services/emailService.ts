/**
 * SEVYA Centralized Transactional Email Service
 * Exclusively powered by Resend (https://resend.com)
 * 
 * Multi-Tenant Architecture:
 * - Tenants and clients never manage or provide SMTP/mail credentials.
 * - SEVYA Platform's centralized Resend API delivers OTP and transactional notifications.
 * - API keys remain strictly server-side in process.env.RESEND_API_KEY.
 */

interface SendOtpEmailOptions {
  name?: string;
  templeName?: string;
  expiresInMinutes?: number;
}

interface SendTransactionalEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

/**
 * Checks if Resend API key is configured
 */
export function isRealEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim().length > 0);
}

/**
 * Returns the active email provider name
 */
export function getEmailProviderName(): string {
  if (isRealEmailConfigured()) {
    return 'Resend API (Central Transactional Provider)';
  }
  return 'Resend (Not Configured - Development Preview Mode)';
}

/**
 * Generate a beautifully styled, responsive HTML email template for Sevya OTP
 */
function buildOtpEmailHtml(otp: string, options: SendOtpEmailOptions = {}): string {
  const templeName = options.templeName || 'Sevya Temple Management';
  const name = options.name || 'Devotee / Sevak';
  const validityMinutes = options.expiresInMinutes || 5;
  const formattedOtp = otp.split('').join(' ');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Sevya Login Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #334155;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0f172a; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.35);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0284c7 0%, #4338ca 50%, #312e81 100%); padding: 32px 24px; text-align: center;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: #f59e0b; width: 44px; height: 44px; border-radius: 12px; text-align: center; vertical-align: middle;">
                    <span style="color: #ffffff; font-size: 24px; font-weight: bold; line-height: 44px;">🙏</span>
                  </td>
                  <td style="padding-left: 14px; text-align: left;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: 0.5px;">SEVYA</h1>
                    <p style="margin: 0; color: #bae6fd; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px;">Unified Operations & Devotional Platform</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 32px 28px 32px; text-align: center;">
              <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 20px; font-weight: 700;">Login Verification Code</h2>
              <p style="margin: 0 0 24px 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                Namaste <strong style="color: #0f172a;">${name}</strong>, please use the 6-digit one-time password below to sign in to <strong>${templeName}</strong>.
              </p>

              <!-- OTP Display Box -->
              <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 22px 16px; margin: 20px 0 24px 0; text-align: center;">
                <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #4338ca; user-select: all;">
                  ${formattedOtp}
                </div>
                <div style="margin-top: 8px; font-size: 12px; color: #94a3b8; font-weight: 500;">
                  (Enter this 6-digit code on the login screen)
                </div>
              </div>

              <!-- Expiry Alert -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px 16px; text-align: left; font-size: 12px; color: #b45309; line-height: 1.5;">
                    ⏳ <strong>Valid for ${validityMinutes} minutes.</strong> Single-use only. Do not share this code with anyone, including temple volunteers or administrators.
                  </td>
                </tr>
              </table>

              <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">
                If you did not request this login code, you can safely ignore this email. Your account remains protected.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #64748b; font-size: 11px;">
                Centralized Platform Service &bull; Multi-Tenant Isolated &bull; Powered by Sevya &bull; Delivered via Resend
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Dispatch an email exclusively via Resend REST API
 */
export async function sendViaResend(
  options: SendTransactionalEmailOptions
): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const configuredFrom = (process.env.RESEND_FROM || process.env.EMAIL_FROM || 'Sevya Platform <onboarding@resend.dev>').trim();

  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      return {
        success: false,
        error: 'RESEND_API_KEY is not configured on the server. Please set RESEND_API_KEY in environment settings.',
      };
    }
    return {
      success: false,
      error: 'RESEND_API_KEY not configured.',
    };
  }

  const toList = Array.isArray(options.to) ? options.to : [options.to];
  const fromSender = configuredFrom.includes('<') ? configuredFrom : `Sevya Auth <${configuredFrom}>`;

  try {
    let res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromSender,
        to: toList,
        subject: options.subject,
        html: options.html,
        text: options.text,
        reply_to: options.replyTo,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      console.log(`[EmailService/Resend] Successfully delivered email to ${toList.join(', ')}. Resend ID: ${data?.id}`);
      return { success: true, id: data?.id };
    }

    const errBody = await res.text();
    console.warn(`[EmailService/Resend] Initial dispatch returned status ${res.status}: ${errBody}`);

    // If initial dispatch failed due to unverified custom domain on Resend account, fallback to default sandbox domain onboarding@resend.dev
    if (
      fromSender !== 'Sevya Platform <onboarding@resend.dev>' &&
      (errBody.includes('domain') || errBody.includes('verify') || errBody.includes('validation_error') || res.status === 403 || res.status === 422)
    ) {
      console.log('[EmailService/Resend] Retrying dispatch with default Resend domain (onboarding@resend.dev)...');
      res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Sevya Platform <onboarding@resend.dev>',
          to: toList,
          subject: options.subject,
          html: options.html,
          text: options.text,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`[EmailService/Resend] Successfully delivered via Resend sandbox domain to ${toList.join(', ')}. Resend ID: ${data?.id}`);
        return { success: true, id: data?.id };
      }

      const retryErr = await res.text();
      let parsedMessage = retryErr;
      try {
        const jsonErr = JSON.parse(retryErr);
        if (jsonErr.message) parsedMessage = jsonErr.message;
      } catch {}
      return { success: false, error: `Resend error: ${parsedMessage}` };
    }

    let parsedMessage = errBody;
    try {
      const jsonErr = JSON.parse(errBody);
      if (jsonErr.message) parsedMessage = jsonErr.message;
    } catch {}
    return { success: false, error: `Resend error: ${parsedMessage}` };
  } catch (err: any) {
    console.error(`[EmailService/Resend] Network exception while dispatching email:`, err);
    return { success: false, error: `Resend network error: ${err?.message || 'Connection failed'}` };
  }
}

/**
 * Send an OTP Email securely to the specified email address exclusively via Resend
 */
export async function sendOtpEmail(
  toEmail: string,
  otp: string,
  options: SendOtpEmailOptions = {}
): Promise<{ success: boolean; messageId?: string; provider?: string; error?: string }> {
  const templeName = options.templeName || 'Sevya Temple Platform';
  const subject = `${otp} is your ${templeName} login verification code`;
  const textBody = `Your Sevya login verification code is: ${otp}\n\nThis code is valid for ${options.expiresInMinutes || 5} minutes. Please do not share it with anyone.`;
  const html = buildOtpEmailHtml(otp, options);

  // 1. Dispatch via Resend API if API Key is configured
  if (isRealEmailConfigured()) {
    const resendResult = await sendViaResend({
      to: toEmail,
      subject,
      html,
      text: textBody,
    });

    if (resendResult.success) {
      console.log(`\n======================================================`);
      console.log(`📧 [SEVYA EMAIL OTP DELIVERED VIA RESEND]`);
      console.log(`To: ${toEmail}`);
      console.log(`Resend Message ID: ${resendResult.id}`);
      console.log(`======================================================\n`);
      return { success: true, messageId: resendResult.id, provider: 'resend' };
    } else {
      console.error(`[EmailService/Resend Error delivering OTP to ${toEmail}]:`, resendResult.error);
      return {
        success: false,
        error: resendResult.error || 'Failed to deliver OTP email via Resend.',
        provider: 'resend',
      };
    }
  }

  // 2. In production without RESEND_API_KEY, explicitly fail
  if (process.env.NODE_ENV === 'production') {
    console.error('[EmailService] Production email delivery blocked: RESEND_API_KEY is not configured.');
    return {
      success: false,
      error: 'Centralized email delivery is not configured. Please configure RESEND_API_KEY in environment variables.',
      provider: 'resend',
    };
  }

  // 3. In development / preview mode when RESEND_API_KEY is pending, log to terminal
  console.log(`\n======================================================`);
  console.log(`ℹ️ [SEVYA EMAIL OTP DEV PREVIEW DISPATCH]`);
  console.log(`To: ${toEmail}`);
  console.log(`Verification Code: [ ${otp} ]`);
  console.log(`Validity: ${options.expiresInMinutes || 5} Minutes`);
  console.log(`Provider: Resend (Configure RESEND_API_KEY for live delivery)`);
  console.log(`======================================================\n`);

  return {
    success: true,
    messageId: 'dev_preview_resend',
    provider: 'resend_dev',
  };
}

/**
 * General helper for sending arbitrary transactional emails (e.g. donations, seva confirmations) via Resend
 */
export async function sendTransactionalEmail(
  options: SendTransactionalEmailOptions
): Promise<{ success: boolean; id?: string; error?: string }> {
  return sendViaResend(options);
}
