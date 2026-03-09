import nodemailer from "nodemailer";

const hasMailConfig = process.env.MAIL_HOST && process.env.MAIL_HOST !== "smtp.example.com" && process.env.MAIL_USERNAME && process.env.MAIL_PASSWORD;

const transporter = hasMailConfig
  ? nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT ?? 587),
      secure: process.env.MAIL_ENCRYPTION === "ssl",
      auth: { user: process.env.MAIL_USERNAME, pass: process.env.MAIL_PASSWORD }
    } as nodemailer.TransportOptions)
  : nodemailer.createTransport({ jsonTransport: true } as nodemailer.TransportOptions);

const FROM = process.env.MAIL_FROM_ADDRESS ?? "support@naymi.tech";
const FROM_NAME = process.env.MAIL_FROM_NAME ?? "Naymi HR";

export async function sendVerificationEmail(to: string, verifyUrl: string, userName?: string, code?: string): Promise<void> {
  const subject = "Подтверждение регистрации в Naymi — осталось 1 шаг";
  const codeBlock = code
    ? `<p><strong>Код подтверждения:</strong> <span style="font-size: 24px; letter-spacing: 4px; font-family: monospace;">${code}</span></p><p>Введите этот код на странице входа или перейдите по ссылке ниже.</p>`
    : "";
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #0d9488;">Добро пожаловать в Naymi!</h2>
  <p>${userName ? `Здравствуйте, ${userName}.` : "Здравствуйте."}</p>
  <p>Для завершения регистрации перейдите по ссылке:</p>
  ${codeBlock}
  <p><a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background: #0d9488; color: white; text-decoration: none; border-radius: 8px;">Подтвердить email</a></p>
  <p>Ссылка и код действительны 48 часов.</p>
  <p>Если вы не регистрировались в Naymi, проигнорируйте это письмо.</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  <p style="color: #666; font-size: 12px;">Naymi — платформа для умного найма</p>
</body>
</html>
`;
  if (!hasMailConfig) {
    console.warn("Письмо верификации не отправлено: настройте MAIL_HOST, MAIL_USERNAME, MAIL_PASSWORD в .env");
    return;
  }
  await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM}>`,
    to,
    subject,
    html
  });
}
