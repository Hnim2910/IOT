import nodemailer from 'nodemailer';

interface MailOptions {
  to: string;
  subject: string;
  text: string;
}

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS
} = process.env;

const isEmailConfigured = Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS);

// Create transporter lazily so tests without SMTP env do not throw
const transporter = isEmailConfigured
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465, // true for default TLS port
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    })
  : null;

export const canSendEmail = () => isEmailConfigured;

export async function sendMail(options: MailOptions) {
  if (!transporter) {
    console.warn('SMTP not configured, skip sending email');
    return false;
  }

  try {
    await transporter.sendMail({
      from: SMTP_USER,
      to: options.to,
      subject: options.subject,
      text: options.text
    });
    return true;
  } catch (error) {
    console.error('Failed to send email', error);
    return false;
  }
}
