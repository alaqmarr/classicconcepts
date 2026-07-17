import nodemailer from 'nodemailer';
import { prisma } from './db';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://classicconcepts.in';
const LOGO_URL = `${SITE_URL}/logo.png`;
const BRAND_BLUE = '#0056b3';
const BRAND_RED = '#e31837';

// ─── Base Email Layout ──────────────────────────────────────────────────────
// Table-based layout for maximum email client compatibility
const getEmailLayout = (preheader: string, content: string, settings: any) => `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Classic Concepts</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style type="text/css">
    /* Reset */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-rspace: 0pt; mso-table-lspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; background-color: #f1f5f9; }
    
    /* Typography */
    body, td, p { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
    h1, h2, h3 { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
    
    /* Mobile */
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; }
      .fluid { max-width: 100% !important; height: auto !important; }
      .stack-column { display: block !important; width: 100% !important; }
      .mobile-pad { padding-left: 20px !important; padding-right: 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9;">

  <!-- Preheader (invisible preview text) -->
  <div style="display: none; font-size: 1px; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${preheader}
  </div>

  <!-- Full-width wrapper -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f1f5f9;">
    <tr>
      <td align="center" style="padding: 30px 10px;">

        <!-- Email Container (600px) -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
          
          <!-- ===== HEADER ===== -->
          <tr>
            <td style="background: linear-gradient(135deg, ${BRAND_BLUE} 0%, #003d80 100%); padding: 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding: 32px 40px 28px 40px; text-align: center;">
                    <a href="${SITE_URL}" target="_blank" style="text-decoration: none;">
                      <img src="${LOGO_URL}" alt="Classic Concepts" width="180" style="display: inline-block; max-width: 180px; height: auto; background: #ffffff; padding: 10px 20px; border-radius: 8px;" />
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ===== BODY ===== -->
          <tr>
            <td style="padding: 40px 40px 32px 40px;" class="mobile-pad">
              ${content}
            </td>
          </tr>

          <!-- ===== DIVIDER ===== -->
          <tr>
            <td style="padding: 0 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr><td style="border-top: 1px solid #e2e8f0; font-size: 0; line-height: 0;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>

          <!-- ===== FOOTER ===== -->
          <tr>
            <td style="padding: 28px 40px 32px 40px; text-align: center;" class="mobile-pad">
              <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #334155;">Classic Concepts Acrylic Pvt. Ltd.</p>
              <p style="margin: 0 0 16px 0; font-size: 12px; color: #94a3b8; line-height: 1.6;">
                ${(settings.address || '').replace(/\\n/g, ' &bull; ')}
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                <tr>
                  ${settings.phone1 ? `<td style="padding: 0 8px;"><a href="tel:${settings.phone1}" style="font-size: 12px; color: ${BRAND_BLUE}; text-decoration: none; font-weight: 600;">&#9742; ${settings.phone1}</a></td>` : ''}
                  <td style="padding: 0 8px;"><a href="mailto:${settings.email}" style="font-size: 12px; color: ${BRAND_BLUE}; text-decoration: none; font-weight: 600;">&#9993; ${settings.email}</a></td>
                </tr>
              </table>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin-top: 20px;">
                <tr>
                  <td style="padding: 0 6px;"><a href="${SITE_URL}" style="display: inline-block; background-color: ${BRAND_BLUE}; color: #ffffff; font-size: 11px; font-weight: 700; text-decoration: none; padding: 8px 16px; border-radius: 20px; letter-spacing: 0.5px;">VISIT WEBSITE</a></td>
                  <td style="padding: 0 6px;"><a href="${SITE_URL}/shop" style="display: inline-block; background-color: #f1f5f9; color: #475569; font-size: 11px; font-weight: 700; text-decoration: none; padding: 8px 16px; border-radius: 20px; letter-spacing: 0.5px;">BROWSE PRODUCTS</a></td>
                </tr>
              </table>
              <p style="margin: 24px 0 0 0; font-size: 11px; color: #cbd5e1;">
                &copy; ${new Date().getFullYear()} Classic Concepts Acrylic Pvt. Ltd. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Email Container -->

      </td>
    </tr>
  </table>

</body>
</html>
`;

// ─── Helpers ────────────────────────────────────────────────────────────────

function sectionHeading(text: string) {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td style="padding: 24px 0 12px 0;">
          <h2 style="margin: 0; font-size: 18px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;">${text}</h2>
        </td>
      </tr>
    </table>
  `;
}

function infoRow(label: string, value: string, isLink = false) {
  const val = isLink
    ? `<a href="${value.includes('@') ? 'mailto:' : 'tel:'}${value}" style="color: ${BRAND_BLUE}; text-decoration: none; font-weight: 600;">${value}</a>`
    : `<span style="color: #1e293b;">${value}</span>`;
  return `
    <tr>
      <td style="padding: 8px 0; font-size: 14px; color: #64748b; vertical-align: top; width: 100px; font-weight: 600;">${label}</td>
      <td style="padding: 8px 0; font-size: 14px; vertical-align: top;">${val}</td>
    </tr>
  `;
}

function productRow(item: { productName: string; productImage?: string; productSlug?: string; quantity: number; price?: number }) {
  const imageUrl = item.productImage?.startsWith('/') ? `${SITE_URL}${item.productImage}` : item.productImage;
  const imgHtml = imageUrl
    ? `<td style="width: 80px; vertical-align: top; padding-right: 16px;">
         <a href="${SITE_URL}/shop/p/${item.productSlug || '#'}" target="_blank" style="text-decoration: none;">
           <img src="${imageUrl}" alt="${item.productName}" width="80" height="80" style="display: block; width: 80px; height: 80px; object-fit: cover; border-radius: 10px; border: 1px solid #e2e8f0;" />
         </a>
       </td>`
    : '';
  
  const priceHtml = item.price && item.price > 0
    ? `<span style="display: inline-block; font-size: 15px; font-weight: 700; color: ${BRAND_BLUE};">&#8377;${item.price.toLocaleString('en-IN')}</span>`
    : `<span style="display: inline-block; font-size: 12px; font-weight: 600; color: #f59e0b; background-color: #fffbeb; padding: 3px 10px; border-radius: 12px;">Price on Request</span>`;

  return `
    <tr>
      <td style="padding: 16px 0; border-bottom: 1px solid #f1f5f9;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            ${imgHtml}
            <td style="vertical-align: top;">
              <a href="${SITE_URL}/shop/p/${item.productSlug || '#'}" target="_blank" style="text-decoration: none; color: #0f172a; font-size: 15px; font-weight: 700; line-height: 1.4; display: block; margin-bottom: 6px;">${item.productName}</a>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding-right: 16px;">
                    <span style="font-size: 12px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Qty:</span>
                    <span style="font-size: 14px; color: #1e293b; font-weight: 700; margin-left: 4px;">${item.quantity}</span>
                  </td>
                  <td>${priceHtml}</td>
                </tr>
              </table>
              <a href="${SITE_URL}/shop/p/${item.productSlug || '#'}" target="_blank" style="display: inline-block; margin-top: 8px; font-size: 11px; font-weight: 700; color: ${BRAND_BLUE}; text-decoration: none; letter-spacing: 0.3px;">VIEW PRODUCT &rarr;</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

function ctaButton(text: string, href: string, color = BRAND_RED) {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 28px auto 0 auto;">
      <tr>
        <td style="border-radius: 8px; background-color: ${color};">
          <a href="${href}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; letter-spacing: 0.5px;">${text}</a>
        </td>
      </tr>
    </table>
  `;
}

function greetingBlock(name: string, message: string) {
  return `
    <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; line-height: 1.3;">Hello ${name},</h1>
    <p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.7;">${message}</p>
  `;
}

function highlightBox(content: string, bgColor = '#f0f9ff', borderColor = BRAND_BLUE) {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
      <tr>
        <td style="background-color: ${bgColor}; border-left: 4px solid ${borderColor}; border-radius: 0 8px 8px 0; padding: 20px 24px;">
          ${content}
        </td>
      </tr>
    </table>
  `;
}


// ─── Transporter ────────────────────────────────────────────────────────────

export async function getTransporter() {
  const settings = await prisma.siteSetting.findUnique({ where: { id: "default" } });
  
  if (!settings?.smtpHost || !settings?.smtpUser || !settings?.smtpPass) {
    throw new Error('SMTP credentials not configured in Site Settings.');
  }

  return {
    transporter: nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort || 587,
      secure: settings.smtpPort === 465, 
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPass,
      },
    }),
    settings
  };
}


// ─── 1. Admin Enquiry Notification ──────────────────────────────────────────

export async function sendAdminEnquiryNotification(data: { name: string; email: string; phone: string; message: string; source: string }) {
  const { transporter, settings } = await getTransporter();
  const adminEmail = settings.adminEmail || settings.email;

  const content = `
    <!-- Badge -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td style="background-color: #dbeafe; color: ${BRAND_BLUE}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 6px 14px; border-radius: 20px;">
          &#9993; New Enquiry &bull; ${data.source}
        </td>
      </tr>
    </table>

    <h1 style="margin: 20px 0 8px 0; font-size: 22px; font-weight: 800; color: #0f172a;">New Enquiry from ${data.name}</h1>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #94a3b8;">Received on ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>

    <!-- Customer Details Card -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
      <tr>
        <td style="padding: 24px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            ${infoRow('Name', data.name)}
            ${infoRow('Email', data.email, true)}
            ${infoRow('Phone', data.phone, true)}
          </table>
        </td>
      </tr>
    </table>

    ${sectionHeading('Message')}
    ${highlightBox(`<p style="margin: 0; font-size: 15px; color: #334155; line-height: 1.7; white-space: pre-wrap;">${data.message}</p>`, '#f8fafc', '#94a3b8')}

    <p style="margin: 20px 0 0 0; font-size: 13px; color: #94a3b8;">You can reply to this enquiry from the Admin Dashboard.</p>
  `;

  await transporter.sendMail({
    from: `"Classic Concepts" <${settings.smtpUser}>`,
    to: adminEmail,
    replyTo: data.email,
    subject: `📩 New Enquiry from ${data.name}`,
    html: getEmailLayout(`New enquiry from ${data.name} via ${data.source}`, content, settings),
  });
}


// ─── 2. Client Enquiry Thank You ────────────────────────────────────────────

export async function sendClientEnquiryThankYou(data: { name: string; email: string }) {
  const { transporter, settings } = await getTransporter();

  const content = `
    ${greetingBlock(data.name, "Thank you for reaching out to <strong>Classic Concepts</strong>! We've received your enquiry and our team is already reviewing it.")}

    ${highlightBox(`
      <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: ${BRAND_BLUE};">What happens next?</p>
      <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.7;">Our team will review your enquiry and respond within <strong>24 hours</strong>. For anything urgent, feel free to call us directly.</p>
    `)}

    <p style="margin: 24px 0 0 0; font-size: 15px; color: #475569; line-height: 1.7;">
      At Classic Concepts, we take pride in delivering premium acrylic products with unmatched craftsmanship. Whether you need podiums, display units, or custom solutions — we're here to help.
    </p>

    ${settings.phone1 ? `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 28px 0 0 0;">
      <tr>
        <td style="background-color: #f0fdf4; border-radius: 12px; padding: 20px 24px; text-align: center;">
          <p style="margin: 0 0 4px 0; font-size: 13px; color: #16a34a; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Need immediate help?</p>
          <a href="tel:${settings.phone1}" style="font-size: 20px; font-weight: 800; color: #15803d; text-decoration: none;">${settings.phone1}</a>
        </td>
      </tr>
    </table>
    ` : ''}

    ${ctaButton('EXPLORE OUR PRODUCTS', `${SITE_URL}/shop`, BRAND_BLUE)}

    <p style="margin: 32px 0 0 0; font-size: 15px; color: #475569; line-height: 1.7;">
      Warm regards,<br/>
      <strong style="color: #0f172a;">The Classic Concepts Team</strong>
    </p>
  `;

  await transporter.sendMail({
    from: `"Classic Concepts" <${settings.smtpUser}>`,
    to: data.email,
    subject: `Thank you for your enquiry, ${data.name}! ✨`,
    html: getEmailLayout(`Thank you for contacting Classic Concepts. We'll get back to you within 24 hours.`, content, settings),
  });
}


// ─── 3. Admin Cart Order Notification ───────────────────────────────────────

export async function sendAdminOrderNotification(data: { name: string; email: string; phone: string; message?: string; items: any[] }) {
  const { transporter, settings } = await getTransporter();
  const adminEmail = settings.adminEmail || settings.email;

  const itemsHtml = data.items.map(item => productRow({
    productName: item.productName,
    productImage: item.productImage,
    productSlug: item.productSlug,
    quantity: item.quantity,
    price: item.price
  })).join('');

  const totalItems = data.items.reduce((acc: number, i: any) => acc + i.quantity, 0);

  const content = `
    <!-- Badge -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td style="background-color: #fef3c7; color: #92400e; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 6px 14px; border-radius: 20px;">
          &#128722; New Cart Request &bull; ${totalItems} item${totalItems > 1 ? 's' : ''}
        </td>
      </tr>
    </table>

    <h1 style="margin: 20px 0 8px 0; font-size: 22px; font-weight: 800; color: #0f172a;">Cart Request from ${data.name}</h1>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #94a3b8;">Received on ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>

    <!-- Customer Details Card -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
      <tr>
        <td style="padding: 24px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            ${infoRow('Name', data.name)}
            ${infoRow('Email', data.email, true)}
            ${infoRow('Phone', data.phone, true)}
          </table>
        </td>
      </tr>
    </table>

    ${data.message ? `
      ${sectionHeading('Customer Message')}
      ${highlightBox(`<p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.7; white-space: pre-wrap;">${data.message}</p>`, '#f8fafc', '#94a3b8')}
    ` : ''}

    ${sectionHeading(`Requested Products (${totalItems})`)}
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <tr>
        <td style="padding: 8px 20px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            ${itemsHtml}
          </table>
        </td>
      </tr>
    </table>

    <p style="margin: 24px 0 0 0; font-size: 13px; color: #94a3b8;">Manage this order from the Admin Dashboard.</p>
  `;

  await transporter.sendMail({
    from: `"Classic Concepts" <${settings.smtpUser}>`,
    to: adminEmail,
    replyTo: data.email,
    subject: `🛒 New Cart Request from ${data.name} (${totalItems} items)`,
    html: getEmailLayout(`New cart request from ${data.name} with ${totalItems} items`, content, settings),
  });
}


// ─── 4. Client Cart Order Thank You ─────────────────────────────────────────

export async function sendClientOrderThankYou(data: { name: string; email: string; items: any[] }) {
  const { transporter, settings } = await getTransporter();

  const itemsHtml = data.items.map(item => productRow({
    productName: item.productName,
    productImage: item.productImage,
    productSlug: item.productSlug,
    quantity: item.quantity,
    price: item.price
  })).join('');

  const totalItems = data.items.reduce((acc: number, i: any) => acc + i.quantity, 0);

  const content = `
    ${greetingBlock(data.name, "Thank you for your interest in our products! We've received your request and our team will review it and get back to you with pricing and availability details.")}

    ${highlightBox(`
      <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: ${BRAND_BLUE};">What happens next?</p>
      <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.7;">Our sales team will review your product selection and reach out with a <strong>detailed quote</strong> within <strong>24–48 hours</strong>.</p>
    `)}

    ${sectionHeading(`Your Requested Products (${totalItems})`)}
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <tr>
        <td style="padding: 8px 20px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            ${itemsHtml}
          </table>
        </td>
      </tr>
    </table>

    ${settings.phone1 ? `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 28px 0 0 0;">
      <tr>
        <td style="background-color: #f0fdf4; border-radius: 12px; padding: 20px 24px; text-align: center;">
          <p style="margin: 0 0 4px 0; font-size: 13px; color: #16a34a; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Questions about your request?</p>
          <a href="tel:${settings.phone1}" style="font-size: 20px; font-weight: 800; color: #15803d; text-decoration: none;">${settings.phone1}</a>
        </td>
      </tr>
    </table>
    ` : ''}

    ${ctaButton('CONTINUE BROWSING', `${SITE_URL}/shop`, BRAND_BLUE)}

    <p style="margin: 32px 0 0 0; font-size: 15px; color: #475569; line-height: 1.7;">
      Warm regards,<br/>
      <strong style="color: #0f172a;">The Classic Concepts Team</strong>
    </p>
  `;

  await transporter.sendMail({
    from: `"Classic Concepts" <${settings.smtpUser}>`,
    to: data.email,
    subject: `Your product request has been received! 🎉`,
    html: getEmailLayout(`Thank you for your product request. We'll send you a quote within 24-48 hours.`, content, settings),
  });
}


// ─── 5. Admin Reply ─────────────────────────────────────────────────────────

export async function sendAdminReply(data: { name: string; email: string; replyMessage: string; originalMessage: string }) {
  const { transporter, settings } = await getTransporter();

  const content = `
    ${greetingBlock(data.name, '')}

    <div style="font-size: 15px; line-height: 1.8; color: #334155; white-space: pre-wrap;">${data.replyMessage}</div>

    <!-- Original Message -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0 0 0;">
      <tr>
        <td style="background-color: #f8fafc; border-left: 4px solid #cbd5e1; border-radius: 0 8px 8px 0; padding: 20px 24px;">
          <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Your original message</p>
          <p style="margin: 0; font-size: 14px; color: #64748b; line-height: 1.7; white-space: pre-wrap;">${data.originalMessage}</p>
        </td>
      </tr>
    </table>

    ${ctaButton('VISIT OUR WEBSITE', SITE_URL, BRAND_BLUE)}

    <p style="margin: 32px 0 0 0; font-size: 15px; color: #475569; line-height: 1.7;">
      Best regards,<br/>
      <strong style="color: #0f172a;">The Classic Concepts Team</strong>
    </p>
  `;

  await transporter.sendMail({
    from: `"Classic Concepts" <${settings.smtpUser}>`,
    to: data.email,
    subject: `Re: Your Enquiry — Classic Concepts`,
    html: getEmailLayout(`We've responded to your enquiry at Classic Concepts.`, content, settings),
  });
}
