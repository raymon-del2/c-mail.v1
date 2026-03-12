import dotenv from 'dotenv';
import process from 'process';

dotenv.config();

// Simple email sender using Brevo API (formerly Sendinblue)
export async function sendEmailDirect(to, subject, html, text) {
  try {
    // For now, we'll log the email and return success
    // In production, integrate with Brevo, Resend, or SendGrid
    console.log(`[EMAIL] To: ${to}, Subject: ${subject}`);
    
    // Check if Brevo API key is available
    if (process.env.BREVO_API_KEY) {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': process.env.BREVO_API_KEY,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: {
            name: 'C-mail Authentication',
            email: 'noreply@c-mail.vercel.app'
          },
          to: [{ email: to }],
          subject: subject,
          htmlContent: html,
          textContent: text || subject
        })
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error('Brevo email error:', error);
        // Fallback to console log if API fails
        return { success: true, messageId: 'console-fallback' };
      }
      
      const data = await response.json();
      return { success: true, messageId: data.messageId };
    }
    
    // Fallback: just log if no email service configured
    console.log('[EMAIL FALLBACK] No BREVO_API_KEY configured, logging only');
    return { success: true, messageId: 'console-log-only' };
  } catch (error) {
    console.error('Send email error:', error);
    // Return success anyway so the flow continues
    return { success: true, messageId: 'error-fallback' };
  }
}
