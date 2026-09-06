import nodemailer from 'nodemailer';
import { adminPool, pool } from '../config/database.js';
import {
  GET_QUOTATION_CONFIRMATION_EMAIL_DATA,
  GET_QUOTATION_CONFIRMATION_ITEMS
} from '../queries/quotation.query.js';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.mailtrap.io';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '2525', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_SERVICE = process.env.SMTP_SERVICE; // e.g. 'gmail'
const SMTP_SECURE = process.env.SMTP_SECURE !== undefined 
  ? process.env.SMTP_SECURE === 'true' 
  : (SMTP_PORT === 465);
const SMTP_FROM = process.env.SMTP_FROM || '"DealFlow360 Operations" <no-reply@dealflow360.internal>';
const FRONTEND_PORTAL_URL = process.env.FRONTEND_PORTAL_URL || 'http://localhost:3001';

let transporter = null;

/**
 * Checks whether legitimate SMTP credentials have been configured
 */
export function isSmtpConfigured() {
  if (!SMTP_USER || !SMTP_PASS) return false;
  const user = SMTP_USER.trim().toLowerCase();
  const pass = SMTP_PASS.trim().toLowerCase();
  if (user === 'test' || user === 'your_smtp_user' || user.includes('your_')) return false;
  if (pass === 'your_smtp_password' || pass.includes('your_')) return false;
  return true;
}

/**
 * Returns configured nodemailer transporter or mock transporter for development
 */
export function getTransporter() {
  if (!transporter) {
    if (isSmtpConfigured()) {
      const config = {
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000
      };

      if (SMTP_SERVICE) {
        config.service = SMTP_SERVICE;
      }

      transporter = nodemailer.createTransport(config);
      console.log(`[Email Service] Live SMTP transporter initialized (${SMTP_SERVICE || SMTP_HOST}:${SMTP_PORT}).`);
    } else {
      // Safe fallback in-memory / console transporter for local dev & testing
      transporter = {
        sendMail: async (options) => {
          console.log(`\n======================================================`);
          console.log(`[Email Service (Dev Mock Mode)] - Email Dispatched`);
          console.log(`To:      ${options.to}`);
          console.log(`From:    ${options.from}`);
          console.log(`Subject: ${options.subject}`);
          if (options.text) {
            console.log(`---------------- Plain Text Preview -----------------`);
            console.log(options.text);
          }
          console.log(`======================================================\n`);
          return { messageId: `dev-mock-${Date.now()}` };
        }
      };
      console.log(`[Email Service] Mock transporter active. Set SMTP_USER & SMTP_PASS in backend/.env for live delivery.`);
    }
  }
  return transporter;
}

/**
 * Verifies the connection configuration with the SMTP server
 */
export async function verifySmtpConnection() {
  if (!isSmtpConfigured()) {
    return {
      success: false,
      isConfigured: false,
      message: 'SMTP credentials are not yet configured in backend/.env (running in Dev Mock mode).'
    };
  }
  try {
    const mailer = getTransporter();
    await mailer.verify();
    return {
      success: true,
      isConfigured: true,
      message: `SMTP server connection verified successfully (${SMTP_SERVICE || SMTP_HOST}:${SMTP_PORT}).`
    };
  } catch (err) {
    return {
      success: false,
      isConfigured: true,
      error: err.message,
      message: `Failed to connect to SMTP server: ${err.message}`
    };
  }
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
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h2 style="color: #0f172a; margin: 0 0 6px 0; font-size: 24px; font-weight: 700;">DealFlow 360</h2>
              <span style="display: inline-block; font-size: 13px; background-color: #f1f5f9; color: #475569; padding: 4px 12px; border-radius: 9999px; font-weight: 500;">Customer Portal Access</span>
            </div>
            <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Hello,</p>
            <p style="font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">You requested secure access to the <strong>${customerCompanyName || 'DealFlow 360'}</strong> Customer Portal. Click the button below to sign in:</p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${magicLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
                Sign In to Customer Portal
              </a>
            </div>
            <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0 0 16px 0;">This secure link is valid for 30 minutes and can only be used once.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">If you did not request this link, you can safely disregard this email.</p>
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
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
            <h3 style="color: #0f766e; margin: 0 0 12px 0; font-size: 20px;">DealFlow 360 — New Inbound RFQ</h3>
            <p style="font-size: 15px; margin: 0 0 12px 0;">Hello <strong>${repName}</strong>,</p>
            <p style="font-size: 15px; margin: 0 0 16px 0;">A new quotation request has been submitted by <strong>${customerName}</strong>.</p>
            <p style="font-size: 14px; background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; margin: 0 0 20px 0;">
              <strong>RFQ Reference ID:</strong> ${rfqId}
            </p>
            <p style="font-size: 14px; color: #475569; margin: 0;">You can convert this inquiry to a formal quotation draft with 1-click in your Sales Workspace.</p>
          </div>
        `
      });
    } catch (err) {
      console.error(`[Email Service Error] Failed sending RFQ alert to ${repEmail}:`, err.message);
    }
  });
}

/**
 * Format currency helper
 */
function formatCurrency(amount) {
  const num = parseFloat(amount || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(num);
}

/**
 * Format date helper
 */
function formatDate(dateStr) {
  if (!dateStr) return 'Pending Confirmation';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return String(dateStr);
  }
}

/**
 * Sends detailed Quotation Confirmation email to customer when quotation status becomes 'confirmed'.
 * Includes full order breakdown, every line item, pricing, discounts, promised delivery date, and rep details.
 */
export function sendQuotationConfirmationEmail({ quotationId }) {
  if (!quotationId) return;

  setImmediate(async () => {
    try {
      const dbPool = adminPool || pool;

      // 1. Fetch quotation summary & customer details
      const quoteRes = await dbPool.query(GET_QUOTATION_CONFIRMATION_EMAIL_DATA, [quotationId]);
      if (quoteRes.rowCount === 0) {
        console.warn(`[Email Service] Cannot send confirmation email: Quotation ID ${quotationId} not found.`);
        return;
      }

      const quote = quoteRes.rows[0];
      const customerEmail = quote.customer_email;
      if (!customerEmail) {
        console.warn(`[Email Service] Customer for quotation ${quote.quotation_code} has no email address.`);
        return;
      }

      // 2. Fetch all line items with product & pricing details
      const itemsRes = await dbPool.query(GET_QUOTATION_CONFIRMATION_ITEMS, [quotationId]);
      const items = itemsRes.rows || [];

      // 3. Compute calculations
      const subtotal = parseFloat(quote.subtotal_amount || 0);
      const totalAmount = parseFloat(quote.total_amount || 0);
      const discountSavings = Math.max(0, subtotal - totalAmount);

      const customerName = quote.customer_contact_name || quote.customer_company_name || 'Valued Customer';
      const companyName = quote.customer_company_name || '';
      const repName = quote.assigned_rep_name || 'DealFlow360 Account Team';
      const repEmail = quote.assigned_rep_email || 'sales@dealflow360.internal';
      const quoteCode = quote.quotation_code;
      const deliveryDateFormatted = formatDate(quote.promised_delivery_date);
      const confirmedDateFormatted = formatDate(quote.updated_at || new Date());
      const portalUrl = `${FRONTEND_PORTAL_URL}/portal`;

      // 4. Generate plain-text version
      let textItemsList = items.map((item, index) => {
        const variantText = item.attribute_name ? ` (${item.attribute_name}: ${item.attribute_value})` : '';
        const discountText = parseFloat(item.applied_discount_pct) > 0 ? ` [${item.applied_discount_pct}% off]` : '';
        const notesText = item.line_notes ? `\n    Note: ${item.line_notes}` : '';
        return `${index + 1}. ${item.product_name}${variantText} [SKU: ${item.product_sku}]
   Qty: ${item.quantity} | Unit: ${formatCurrency(item.calculated_unit_price)}${discountText} | Total: ${formatCurrency(item.line_total)}${notesText}`;
      }).join('\n\n');

      const plainText = `
DEALFLOW 360 — QUOTATION CONFIRMATION
======================================================
Quotation Reference: ${quoteCode}
Status: CONFIRMED
Confirmation Date:   ${confirmedDateFormatted}
Promised Delivery:   ${deliveryDateFormatted}

Customer:            ${customerName} (${companyName})
Email:               ${customerEmail}
Customer Tier:       ${quote.customer_tier || 'Standard'}
Assigned Rep:        ${repName} (${repEmail})

------------------------------------------------------
ORDERED ITEMS & SPECIFICATIONS
------------------------------------------------------
${textItemsList || 'No line items.'}

------------------------------------------------------
FINANCIAL SUMMARY
------------------------------------------------------
Subtotal:            ${formatCurrency(subtotal)}
Total Savings:       ${formatCurrency(discountSavings)}
GRAND TOTAL:         ${formatCurrency(totalAmount)}

Access your customer portal to view real-time fulfillment status:
${portalUrl}

Thank you for your business!
Sales Operations & Fulfillment Team
DealFlow 360
======================================================
`.trim();

      // 5. Generate HTML Items Table rows
      const htmlItemRows = items.map((item) => {
        const variantHtml = item.attribute_name 
          ? `<div style="font-size: 12px; color: #64748b; margin-top: 2px;"><span style="background: #f1f5f9; padding: 1px 6px; border-radius: 4px;">${item.attribute_name}: ${item.attribute_value}</span></div>` 
          : '';
        const notesHtml = item.line_notes 
          ? `<div style="font-size: 12px; color: #0284c7; font-style: italic; margin-top: 4px;">Note: ${item.line_notes}</div>` 
          : '';
        const discountBadge = parseFloat(item.applied_discount_pct) > 0
          ? `<span style="display: inline-block; font-size: 11px; font-weight: 600; color: #059669; background: #ecfdf5; padding: 2px 6px; border-radius: 4px;">-${item.applied_discount_pct}%</span>`
          : `<span style="color: #94a3b8; font-size: 12px;">—</span>`;

        return `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 12px 10px; vertical-align: top;">
              <strong style="color: #1e293b; font-size: 14px;">${item.product_name}</strong>
              <div style="font-size: 12px; color: #64748b;">SKU: ${item.product_sku}</div>
              ${variantHtml}
              ${notesHtml}
            </td>
            <td style="padding: 12px 10px; text-align: center; vertical-align: top; font-size: 14px; font-weight: 600; color: #334155;">
              ${item.quantity}
            </td>
            <td style="padding: 12px 10px; text-align: right; vertical-align: top; font-size: 13px; color: #64748b;">
              ${formatCurrency(item.unit_list_price)}
            </td>
            <td style="padding: 12px 10px; text-align: center; vertical-align: top;">
              ${discountBadge}
            </td>
            <td style="padding: 12px 10px; text-align: right; vertical-align: top; font-size: 14px; font-weight: 600; color: #1e293b;">
              ${formatCurrency(item.calculated_unit_price)}
            </td>
            <td style="padding: 12px 10px; text-align: right; vertical-align: top; font-size: 14px; font-weight: 700; color: #0f172a;">
              ${formatCurrency(item.line_total)}
            </td>
          </tr>
        `;
      }).join('');

      // 6. Generate Complete HTML Email
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Quotation Confirmation - ${quoteCode}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
          <div style="max-width: 680px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0;">
            
            <!-- Header Banner -->
            <div style="background: linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%); padding: 28px 32px; color: #ffffff;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #93c5fd;">DealFlow 360 Order Confirmation</span>
                <span style="background-color: #10b981; color: #ffffff; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase;">Confirmed</span>
              </div>
              <h1 style="font-size: 26px; font-weight: 800; margin: 0 0 6px 0; color: #ffffff;">Quotation ${quoteCode}</h1>
              <p style="margin: 0; font-size: 14px; color: #e0f2fe;">Thank you for your confirmation. Your order has been locked and forwarded for fulfillment.</p>
            </div>

            <div style="padding: 32px;">
              
              <!-- Customer & Logistics Overview -->
              <div style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; padding: 18px; margin-bottom: 24px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                  <tr>
                    <td style="width: 50%; vertical-align: top; padding-right: 12px;">
                      <div style="color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">Customer Information</div>
                      <div style="font-size: 15px; font-weight: 700; color: #0f172a;">${customerName}</div>
                      ${companyName ? `<div style="color: #334155; font-size: 13px; margin-top: 1px;">${companyName}</div>` : ''}
                      <div style="color: #64748b; font-size: 13px; margin-top: 2px;">${customerEmail}</div>
                      ${quote.customer_tier ? `<div style="margin-top: 4px;"><span style="font-size: 11px; background: #e2e8f0; color: #334155; padding: 2px 6px; border-radius: 4px; font-weight: 600;">Tier: ${quote.customer_tier}</span></div>` : ''}
                    </td>
                    <td style="width: 50%; vertical-align: top; padding-left: 12px; border-left: 1px solid #e2e8f0;">
                      <div style="color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">Delivery & Rep Details</div>
                      <div style="margin-bottom: 4px;">
                        <strong style="color: #334155;">Promised Delivery:</strong>
                        <span style="color: #0369a1; font-weight: 600;"> ${deliveryDateFormatted}</span>
                      </div>
                      <div style="margin-bottom: 4px;">
                        <strong style="color: #334155;">Confirmation Date:</strong>
                        <span style="color: #475569;"> ${confirmedDateFormatted}</span>
                      </div>
                      <div>
                        <strong style="color: #334155;">Sales Rep:</strong>
                        <span style="color: #475569;"> ${repName} (${repEmail})</span>
                      </div>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Itemized Table Header -->
              <h3 style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0;">Itemized Details & Pricing</h3>

              <!-- Line Items Table -->
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; text-align: left;">
                <thead>
                  <tr style="background-color: #f1f5f9; border-bottom: 2px solid #e2e8f0;">
                    <th style="padding: 10px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase;">Product</th>
                    <th style="padding: 10px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: center;">Qty</th>
                    <th style="padding: 10px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: right;">List Price</th>
                    <th style="padding: 10px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: center;">Disc %</th>
                    <th style="padding: 10px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: right;">Unit Price</th>
                    <th style="padding: 10px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${htmlItemRows}
                </tbody>
              </table>

              <!-- Totals Breakdown Card -->
              <div style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; padding: 18px; margin-bottom: 28px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="font-size: 14px; color: #64748b; padding-bottom: 6px;">Subtotal Amount:</td>
                    <td style="font-size: 14px; color: #334155; font-weight: 600; text-align: right; padding-bottom: 6px;">${formatCurrency(subtotal)}</td>
                  </tr>
                  ${discountSavings > 0 ? `
                  <tr>
                    <td style="font-size: 14px; color: #059669; padding-bottom: 6px;">Total Discount Savings:</td>
                    <td style="font-size: 14px; color: #059669; font-weight: 600; text-align: right; padding-bottom: 6px;">-${formatCurrency(discountSavings)}</td>
                  </tr>` : ''}
                  <tr style="border-top: 2px solid #cbd5e1;">
                    <td style="font-size: 17px; font-weight: 800; color: #0f172a; padding-top: 10px;">Grand Total Confirmed:</td>
                    <td style="font-size: 20px; font-weight: 800; color: #2563eb; text-align: right; padding-top: 10px;">${formatCurrency(totalAmount)}</td>
                  </tr>
                </table>
              </div>

              <!-- Portal Access CTA Button -->
              <div style="text-align: center; margin: 32px 0 20px 0;">
                <a href="${portalUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.25);">
                  View Order & Tracking in Customer Portal
                </a>
              </div>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0 18px 0;" />
              
              <!-- Footer Note -->
              <div style="color: #94a3b8; font-size: 12px; text-align: center; line-height: 1.6;">
                <p style="margin: 0 0 4px 0;">DealFlow 360 Enterprise Sales & Operations Platform</p>
                <p style="margin: 0;">Have questions about your order? Reach out directly to your assigned sales representative at <a href="mailto:${repEmail}" style="color: #0284c7; text-decoration: none;">${repEmail}</a>.</p>
              </div>

            </div>
          </div>
        </body>
        </html>
      `;

      // 7. Send the email
      const mailer = getTransporter();
      const info = await mailer.sendMail({
        from: SMTP_FROM,
        to: customerEmail,
        subject: `Order Confirmed: Quotation ${quoteCode} - DealFlow 360`,
        text: plainText,
        html: htmlContent
      });

      console.log(`[Email Service] Quotation confirmation email sent successfully to ${customerEmail} (Quote: ${quoteCode}, MessageId: ${info.messageId}).`);
    } catch (err) {
      console.error(`[Email Service Error] Failed to send quotation confirmation email for quote ${quotationId}:`, err.message);
    }
  });
}

/**
 * Sends Executive Governance & Analytics Report email to Administrator
 * Can be triggered on-demand ("Send Now") or via scheduled cron job.
 */
export async function sendGovernanceReportEmail({ recipientEmail, metrics, filterInfo = {} }) {
  if (!recipientEmail) {
    throw new Error('Recipient email is required to send governance report.');
  }

  const overview = metrics?.overview || {};
  const repPerformance = metrics?.repPerformance || [];
  const statusBreakdown = metrics?.statusBreakdown || [];
  const ledger = metrics?.ledger || [];
  const triggerType = filterInfo.triggeredBy || 'Manual On-Demand';
  const periodLabel = filterInfo.periodLabel || 'All Time';
  const timestamp = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
  const staffUrl = process.env.FRONTEND_STAFF_URL || 'http://localhost:3000';

  // Format numbers
  const quotesCreated = overview.quotes_created || 0;
  const confirmedRevenue = formatCurrency(overview.total_confirmed_revenue || 0);
  const avgApprovalTime = overview.avg_approval_time_hours !== null && overview.avg_approval_time_hours !== undefined
    ? `${overview.avg_approval_time_hours} hrs`
    : 'N/A';
  const avgMargin = overview.avg_margin_pct ? `${Number(overview.avg_margin_pct).toFixed(1)}%` : 'N/A';

  // Build Rep Performance Table rows
  const repRowsHtml = repPerformance.length > 0
    ? repPerformance.map((rep) => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px; font-weight: 600; color: #1e293b;">${rep.rep_name || 'Unassigned'}</td>
          <td style="padding: 10px; text-align: center; color: #475569;">${rep.total_quotes || 0}</td>
          <td style="padding: 10px; text-align: center; font-weight: 600; color: #059669;">${rep.won_quotes || 0}</td>
          <td style="padding: 10px; text-align: right; font-weight: 600; color: #0f172a;">${formatCurrency(rep.total_revenue || 0)}</td>
          <td style="padding: 10px; text-align: right; color: #475569;">${Number(rep.avg_margin_pct || 0).toFixed(1)}%</td>
        </tr>
      `).join('')
    : `<tr><td colspan="5" style="padding: 12px; text-align: center; color: #94a3b8;">No sales rep data in this period.</td></tr>`;

  // Build Quotation Ledger rows (recent 8)
  const ledgerSnippet = ledger.slice(0, 8);
  const ledgerRowsHtml = ledgerSnippet.length > 0
    ? ledgerSnippet.map((item) => `
        <tr style="border-bottom: 1px solid #f1f5f9; font-size: 13px;">
          <td style="padding: 8px 10px; font-weight: 700; color: #2563eb;">${item.quotation_code || '-'}</td>
          <td style="padding: 8px 10px; color: #1e293b;">${item.customer_name || '-'}</td>
          <td style="padding: 8px 10px; color: #475569;">${item.rep_name || 'N/A'}</td>
          <td style="padding: 8px 10px; text-align: center;">
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; color: #334155;">
              ${item.status}
            </span>
          </td>
          <td style="padding: 8px 10px; text-align: right; font-weight: 600; color: #0f172a;">${formatCurrency(item.total_amount)}</td>
        </tr>
      `).join('')
    : `<tr><td colspan="5" style="padding: 12px; text-align: center; color: #94a3b8;">No recent quotations.</td></tr>`;

  // Build Plain Text
  const plainText = `
DEALFLOW 360 — EXECUTIVE GOVERNANCE REPORT
======================================================
Generated At:   ${timestamp}
Trigger Type:   ${triggerType}
Filter Period:  ${periodLabel}
Recipient:      ${recipientEmail}

EXECUTIVE OVERVIEW METRICS:
- Quotes Created:           ${quotesCreated}
- Confirmed Revenue:        ${confirmedRevenue}
- Avg Approval Turnaround:  ${avgApprovalTime}
- Avg Confirmed Margin:     ${avgMargin}

SALES REP PERFORMANCE:
${repPerformance.map(r => `• ${r.rep_name || 'Unassigned'}: Quotes: ${r.total_quotes}, Won: ${r.won_quotes}, Rev: ${formatCurrency(r.total_revenue)}, Margin: ${r.avg_margin_pct}%`).join('\n') || 'None'}

RECENT AUDIT LEDGER:
${ledgerSnippet.map(l => `• [${l.quotation_code}] ${l.customer_name} | ${l.status.toUpperCase()} | ${formatCurrency(l.total_amount)}`).join('\n') || 'None'}

Log into DealFlow 360 for full drilldowns:
${staffUrl}/catalog/governance

DealFlow 360 Operations System
======================================================
`.trim();

  // Build HTML Email
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>DealFlow 360 Governance Report</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
      <div style="max-width: 680px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px 32px; color: #ffffff;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #f43f5e;">ADMIN GOVERNANCE REPORT</span>
            <span style="background: rgba(255,255,255,0.15); color: #ffffff; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 4px;">${triggerType}</span>
          </div>
          <h1 style="font-size: 24px; font-weight: 800; margin: 0 0 6px 0; color: #ffffff;">Sales &amp; Governance Telemetry</h1>
          <p style="margin: 0; font-size: 13px; color: #94a3b8;">Period: <strong>${periodLabel}</strong> | Generated: ${timestamp}</p>
        </div>

        <div style="padding: 28px 32px;">

          <!-- 4 Executive KPI Cards -->
          <table style="width: 100%; border-collapse: separate; border-spacing: 8px; margin-bottom: 24px;">
            <tr>
              <td style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; width: 25%; text-align: center;">
                <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 4px;">Quotes Created</div>
                <div style="font-size: 20px; font-weight: 800; color: #0f172a;">${quotesCreated}</div>
              </td>
              <td style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; width: 25%; text-align: center;">
                <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 4px;">Confirmed Rev</div>
                <div style="font-size: 20px; font-weight: 800; color: #059669;">${confirmedRevenue}</div>
              </td>
              <td style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; width: 25%; text-align: center;">
                <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 4px;">Avg Turnaround</div>
                <div style="font-size: 20px; font-weight: 800; color: #0284c7;">${avgApprovalTime}</div>
              </td>
              <td style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; width: 25%; text-align: center;">
                <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 4px;">Avg Margin</div>
                <div style="font-size: 20px; font-weight: 800; color: #7c3aed;">${avgMargin}</div>
              </td>
            </tr>
          </table>

          <!-- Sales Rep Leaderboard -->
          <h3 style="font-size: 15px; font-weight: 700; color: #0f172a; margin: 0 0 10px 0;">Sales Representative Performance</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
            <thead>
              <tr style="background-color: #f1f5f9; border-bottom: 2px solid #e2e8f0; text-align: left;">
                <th style="padding: 8px 10px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">Rep Name</th>
                <th style="padding: 8px 10px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: center;">Quotes</th>
                <th style="padding: 8px 10px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: center;">Won</th>
                <th style="padding: 8px 10px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: right;">Total Rev</th>
                <th style="padding: 8px 10px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: right;">Margin</th>
              </tr>
            </thead>
            <tbody>
              ${repRowsHtml}
            </tbody>
          </table>

          <!-- Recent Quotation Ledger -->
          <h3 style="font-size: 15px; font-weight: 700; color: #0f172a; margin: 0 0 10px 0;">Recent Quotation Audit Ledger</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <thead>
              <tr style="background-color: #f1f5f9; border-bottom: 2px solid #e2e8f0; text-align: left;">
                <th style="padding: 8px 10px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">Code</th>
                <th style="padding: 8px 10px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">Customer</th>
                <th style="padding: 8px 10px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">Rep</th>
                <th style="padding: 8px 10px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: center;">Status</th>
                <th style="padding: 8px 10px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${ledgerRowsHtml}
            </tbody>
          </table>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 28px 0 16px 0;">
            <a href="${staffUrl}/catalog/governance" style="background-color: #0f172a; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">
              Open Full Governance Dashboard
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 14px 0;" />
          <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
            This executive report was dispatched automatically by DealFlow 360 for Administrator review.
          </p>

        </div>
      </div>
    </body>
    </html>
  `;

  const mailer = getTransporter();
  const info = await mailer.sendMail({
    from: SMTP_FROM,
    to: recipientEmail,
    subject: `[Executive Report] DealFlow 360 Governance & Sales Telemetry (${periodLabel})`,
    text: plainText,
    html: htmlContent
  });

  console.log(`[Email Service] Governance report email dispatched to ${recipientEmail} (MessageId: ${info.messageId}).`);
  return { success: true, messageId: info.messageId, recipient: recipientEmail };
}
