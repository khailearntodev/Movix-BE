import nodemailer from 'nodemailer';

const host = process.env.SMTP_HOST;
const port = parseInt(process.env.SMTP_PORT || '587');
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.SMTP_FROM || user;
const appName = process.env.APP_NAME || 'Movix';
const supportEmail = process.env.SUPPORT_EMAIL || from;

// 1. Gán link banner mới
const bannerUrl =
  'https://www.devicemag.com/wp-content/uploads/2023/03/netflix-error-22004-2.jpg';
// 2. Xóa logoUrl
// const logoUrl = process.env.LOGO_URL || ''; 

if (!user || !pass) {
  console.warn(
    'SMTP_USER hoặc SMTP_PASS chưa được thiết lập. Gửi email sẽ thất bại.',
  );
}

const transporter = nodemailer.createTransport({
  host: host,
  port: port,
  secure: port === 465,
  auth: {
    user: user,
    pass: pass,
  },
});

function escapeHtml(unsafe: any) {
  if (!unsafe && unsafe !== 0) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

interface EmailOptions {
  name?: string;
  expiresMinutes?: number;
}

export const sendVerificationEmail = async (
  to: string,
  otp: string,
  options: EmailOptions = {},
) => {
  const name = options.name ? escapeHtml(options.name) : '';
  const expiresMinutes = options.expiresMinutes ?? 10;
  const subject = `${appName} — Mã xác thực tài khoản của bạn`;

  const text = [
    `Chào mừng đến với ${appName}!`,
    `Mã xác thực của bạn là: ${otp}`,
    `Mã này sẽ hết hạn sau ${expiresMinutes} phút.`,
    `— Đội ngũ ${appName}`,
  ].join('\n');

  const html = `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
    <style>
      body { margin: 0; padding: 0; background-color: #141414; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
      .container { width: 100%; max-width: 600px; margin: 0 auto; background-color: #222222; border-radius: 8px; overflow: hidden; }
      .header { padding: 20px 24px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid #333; }
      .appName { font-weight: 600; font-size: 18px; color: #F5F5F5; }
      .banner img { width: 100%; height: auto; display: block; }
      .content { padding: 28px 24px 16px 24px; }
      .content h1 { margin: 0 0 12px 0; font-size: 20px; color: #F5F5F5; }
      .content p { margin: 0 0 20px 0; color: #F5F5F5; line-height: 1.5; }
      .otp-box { margin: 20px 0 30px 0; text-align: center; }
      .otp { background-color: #E50914; color: #FFFFFF; padding: 18px 28px; border-radius: 12px; font-size: 28px; letter-spacing: 4px; font-weight: 700; font-family: monospace; display: inline-block; }
      .footer { padding: 16px 24px; background-color: #111111; border-top: 1px solid #333; text-align: center; color: #999999; font-size: 12px; }
      .footer a { color: #E50914; text-decoration: none; }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:#141414;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#141414;padding:24px 0;">
      <tr>
        <td align="center">
          <table class="container" role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background-color:#222222;border-radius:8px;overflow:hidden;">
            ${
              `<tr><td class="banner"><img src="${escapeHtml(bannerUrl)}" alt="Movix Banner" style="width:100%;height:auto;display:block;" /></td></tr>`
            }
            <tr>
              <td class="header" style="padding:20px 24px;border-bottom:1px solid #333;display:flex;align-items:center;gap:12px;">
                ${
                  ''
                }
                <div class="appName" style="font-weight:600;font-size:18px;color:#F5F5F5;">${escapeHtml(appName)}</div>
              </td>
            </tr>
            <tr>
              <td class="content" style="padding:28px 24px 16px 24px;">
                <h1 style="margin:0 0 12px 0;font-size:20px;color:#F5F5F5;">Mã xác thực của bạn</h1>
                <p style="margin:0 0 20px 0;color:#F5F5F5;line-height:1.5;">
                  ${name ? `Xin chào ${name},` : 'Xin chào,'}
                  <br />
                  Vui lòng sử dụng mã bên dưới để xác thực địa chỉ email của bạn. Mã có hiệu lực trong <strong>${expiresMinutes} phút</strong>.
                </p>
                <div class="otp-box" style="margin:20px 0 30px 0;text-align:center;">
                  <div class="otp" style="background-color:#E50914;color:#FFFFFF;padding:18px 28px;border-radius:12px;font-size:28px;letter-spacing:4px;font-weight:700;font-family:monospace;display:inline-block;">
                    ${escapeHtml(otp)}
                  </div>
                </div>
                <hr style="border:none;border-top:1px solid #333;margin:24px 0;" />
                <p style="margin:0;color:#999999;font-size:13px;line-height:1.5;">
                  Nếu bạn không yêu cầu mã này, hãy bỏ qua email này. <br />
                  Liên hệ hỗ trợ: <a href="mailto:${escapeHtml(supportEmail)}" style="color:#E50914;text-decoration:none;">${escapeHtml(supportEmail)}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td class="footer" style="padding:16px 24px;background-color:#111111;border-top:1px solid #333;text-align:center;color:#999999;font-size:12px;">
                © ${new Date().getFullYear()} ${escapeHtml(appName)}. All rights reserved.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  // === GỬI EMAIL XÁC THỰC ===
  try {
    await transporter.sendMail({
      from: `"${appName}" <${from}>`,
      to,
      subject,
      text,
      html,
    });
    console.log(`Email xác thực đã gửi tới: ${to}`);
  } catch (error) {
    console.error(`Lỗi khi gửi email: `, error);
    throw new Error('Không thể gửi email xác thực.');
  }
};

export const sendPasswordResetEmail = async (
  to: string,
  token: string,
  options: EmailOptions = {},
) => {
  const name = options.name ? escapeHtml(options.name) : '';
  const expiresMinutes = options.expiresMinutes ?? 10;

  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  const subject = `${appName} — Yêu cầu đặt lại mật khẩu`;
  const text = [
    `Chào ${name || 'bạn'},`,
    `Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản ${appName} của bạn.`,
    `Nhấp vào link sau để đặt lại mật khẩu (link có hiệu lực trong ${expiresMinutes} phút):`,
    resetLink,
    `Nếu bạn không yêu cầu điều này, vui lòng bỏ qua email.`,
    `— Đội ngũ ${appName}`,
  ].join('\n');

  const html = `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
    <style>
      body { margin: 0; padding: 0; background-color: #141414; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
      .container { width: 100%; max-width: 600px; margin: 0 auto; background-color: #222222; border-radius: 8px; overflow: hidden; }
      .header { padding: 20px 24px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid #333; }
      .appName { font-weight: 600; font-size: 18px; color: #F5F5F5; }
      .banner img { width: 100%; height: auto; display: block; }
      .content { padding: 28px 24px 16px 24px; }
      .content h1 { margin: 0 0 12px 0; font-size: 20px; color: #F5F5F5; }
      .content p { margin: 0 0 20px 0; color: #F5F5F5; line-height: 1.5; }
      .button-box { margin: 20px 0 30px 0; text-align: center; }
      .button { background-color: #E50914; color: #FFFFFF; padding: 14px 28px; border-radius: 8px; font-size: 16px; font-weight: 700; text-decoration: none; display: inline-block; }
      .footer { padding: 16px 24px; background-color: #111111; border-top: 1px solid #333; text-align: center; color: #999999; font-size: 12px; }
      .footer a { color: #E50914; text-decoration: none; }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:#141414;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#141414;padding:24px 0;">
      <tr>
        <td align="center">
          <table class="container" role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background-color:#222222;border-radius:8px;overflow:hidden;">
            ${
              `<tr><td class="banner"><img src="${escapeHtml(bannerUrl)}" alt="Movix Banner" style="width:100%;height:auto;display:block;" /></td></tr>`
            }
            <tr>
              <td class="header" style="padding:20px 24px;border-bottom:1px solid #333;display:flex;align-items:center;gap:12px;">
                ${

                  ''
                }
                <div class="appName" style="font-weight:600;font-size:18px;color:#F5F5F5;">${escapeHtml(appName)}</div>
              </td>
            </tr>
            <tr>
              <td class="content" style="padding:28px 24px 16px 24px;">
                <h1 style="margin:0 0 12px 0;font-size:20px;color:#F5F5F5;">Đặt lại mật khẩu</h1>
                <p style="margin:0 0 20px 0;color:#F5F5F5;line-height:1.5;">
                  ${name ? `Xin chào ${name},` : 'Xin chào,'}
                  <br />
                  Bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu. Nhấn nút bên dưới để tiếp tục. Link có hiệu lực trong <strong>${expiresMinutes} phút</strong>.
                </p>
                <div class="button-box" style="margin:20px 0 30px 0;text-align:center;">
                  <a href="${escapeHtml(resetLink)}" class="button" style="background-color:#E50914;color:#FFFFFF;padding:14px 28px;border-radius:8px;font-size:16px;font-weight:700;text-decoration:none;display:inline-block;">
                    Đặt Lại Mật Khẩu
                  </a>
                </div>
                <hr style="border:none;border-top:1px solid #333;margin:24px 0;" />
                <p style="margin:0;color:#999999;font-size:13px;line-height:1.5;">
                  Nếu bạn không yêu cầu điều này, hãy bỏ qua email này. <br />
                  Liên hệ hỗ trợ: <a href="mailto:${escapeHtml(supportEmail)}" style="color:#E50914;text-decoration:none;">${escapeHtml(supportEmail)}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td class="footer" style="padding:16px 24px;background-color:#111111;border-top:1px solid #333;text-align:center;color:#999999;font-size:12px;">
                © ${new Date().getFullYear()} ${escapeHtml(appName)}. All rights reserved.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  // === GỬI EMAIL ===
  try {
    await transporter.sendMail({
      from: `"${appName}" <${from}>`,
      to,
      subject,
      text,
      html,
    });
    console.log(`Email reset mật khẩu đã gửi tới: ${to}`);
  } catch (error) {
    console.error(`Lỗi khi gửi email: `, error);
    throw new Error('Không thể gửi email reset mật khẩu.');
  }
};