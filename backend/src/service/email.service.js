import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.mailtrap.io';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '2525', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || '"DealFlow360 Operations" <no-reply@dealflow360.internal>';

let transporter = null;

function getTransporter() {
  if (!transporter) {
    if (SMTP_USER && SMTP_PASS && SMTP_USER !== 'test') {
      transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS
        }
      });
    } else {
      // Fallback in-memory or log-only transporter for development/testing
      transporter = {
        sendMail: async (options) => {
          console.log(`[Email Service (Dev Mode)] To: ${options.to} | Subject: ${options.subject}`);
          if (options.text) console.log(`[Email Content - Text]:\n${options.text}`);
          return { messageId: `dev-mock-${Date.now()}` };
        }
      };
    }
  }
  return transporter;
}

/**
 * Sends magic link email asynchronously without blocking HTTP response
 */
export function sendMagicLinkEmail({ toEmail, magicLink, customerCompanyName }) {
  setImmediate(async () => {
    try {
      const mailer = getTransporter();
      await mailer.sendMail({
        from: SMTP_FROM,
        to: toEmail,
        subject: `Your DealFlow360 Customer Portal Login Link`,
        text: `Hello,\n\nYou requested access to the ${customerCompanyName || 'DealFlow360'} Customer Portal.\n\nPlease click the link below to securely sign in (valid for 30 minutes):\n${magicLink}\n\nIf you did not request this email, please ignore it.\n\nBest regards,\nSales Operations Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #1e3a8a;">DealFlow 360 Customer Portal</h2>
            <p>Hello,</p>
            <p>You requested access to the <strong>${customerCompanyName || 'DealFlow 360'}</strong> Customer Portal.</p>
            <p style="margin: 25px 0;">
              <a href="${magicLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Access Customer Portal
              </a>
            </p>
            <p style="color: #6b7280; font-size: 13px;">This link will expire in 30 minutes and can only be used once.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #9ca3af; font-size: 12px;">If you did not request this link, you can safely disregard this email.</p>
          </div>
        `
      });
    } catch (err) {
      console.error(`[Email Service Error] Failed sending magic link to ${toEmail}:`, err.message);
    }
  });
}

/**
 * Sends RFQ received notification email to assigned sales rep
 */
export function sendRfqNotificationEmail({ repEmail, repName, customerName, rfqId }) {
  setImmediate(async () => {
    try {
      const mailer = getTransporter();
      await mailer.sendMail({
        from: SMTP_FROM,
        to: repEmail,
        subject: `[DealFlow 360] New Inbound RFQ from ${customerName}`,
        text: `Hello ${repName},\n\nA new quotation request (${rfqId}) has been submitted by ${customerName}.\nLog into DealFlow 360 to review and convert it into a draft quotation.\n\nBest regards,\nDealFlow 360 Notification System`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h3 style="color: #0f766e;">DealFlow 360 — New Inbound RFQ</h3>
            <p>Hello <strong>${repName}</strong>,</p>
            <p>A new quotation request has been submitted by <strong>${customerName}</strong>.</p>
            <p><strong>RFQ Reference:</strong> ${rfqId}</p>
            <p>You can convert this inquiry to a formal quotation draft with 1-click in your Sales Workspace.</p>
          </div>
        `
      });
    } catch (err) {
      console.error(`[Email Service Error] Failed sending RFQ alert to ${repEmail}:`, err.message);
    }
  });
}
