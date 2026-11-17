import { formatCurrency } from "@/lib/utils";
import tls from "node:tls";

type EmailInput = {
  to: string;
  subject: string;
  html: string;
};

type OrderEmailInput = {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  totalPaise: number;
  items: Array<{ productName: string; quantity: number }>;
};

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

function emailFrame(content: string) {
  return `<!doctype html><html><body style="margin:0;background:#f6f1e8;color:#211f1a;font-family:Arial,sans-serif"><div style="max-width:600px;margin:0 auto;padding:40px 24px"><div style="font-family:Georgia,serif;font-size:32px;margin-bottom:28px">Morrow</div><div style="background:#fff;padding:32px;border:1px solid #e7ddcd">${content}</div><p style="margin-top:20px;color:#78716c;font-size:12px;line-height:1.6">Morrow · Thoughtful objects from independent makers</p></div></body></html>`;
}

async function sendEmail(input: EmailInput) {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    await sendSmtpEmail(input);
    return { sent: true as const, provider: "smtp" as const };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false as const, reason: "not_configured" as const };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Morrow <onboarding@resend.dev>",
      to: [input.to],
      subject: input.subject,
      html: input.html,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Email delivery failed (${response.status}): ${details.slice(0, 300)}`);
  }
  return { sent: true as const, provider: "resend" as const };
}

async function sendSmtpEmail(input: EmailInput) {
  const host = process.env.SMTP_HOST!;
  const port = Number(process.env.SMTP_PORT ?? 465);
  const user = process.env.SMTP_USER!;
  const password = process.env.SMTP_PASS!;
  const from = process.env.EMAIL_FROM ?? `Morrow <${user}>`;
  const rejectUnauthorized = process.env.SMTP_REJECT_UNAUTHORIZED !== "false";
  const socket = tls.connect({ host, port, servername: host, rejectUnauthorized });
  socket.setTimeout(20_000);

  let buffer = "";
  const queuedResponses: string[] = [];
  const responses: Array<(message: string) => void> = [];
  const failures: Array<(error: Error) => void> = [];
  socket.setEncoding("utf8");
  socket.on("data", (chunk: string) => {
    buffer += chunk;
    const lines = buffer.trimEnd().split("\r\n");
    if (!lines.length || !/^\d{3} /.test(lines.at(-1) ?? "")) return;
    const response = buffer;
    buffer = "";
    const resolve = responses.shift();
    if (resolve) resolve(response);
    else queuedResponses.push(response);
  });
  socket.on("error", (error) => { while (failures.length) failures.shift()?.(error); });
  socket.on("timeout", () => { const error = new Error("SMTP connection timed out."); while (failures.length) failures.shift()?.(error); });

  const read = () => queuedResponses.length
    ? Promise.resolve(queuedResponses.shift()!)
    : new Promise<string>((resolve, reject) => { responses.push(resolve); failures.push(reject); });
  const command = async (value: string, expected: number) => {
    socket.write(`${value}\r\n`);
    const response = await read();
    if (!response.startsWith(String(expected))) throw new Error(`SMTP rejected command (${response.trim().slice(0, 180)}).`);
  };

  await new Promise<void>((resolve, reject) => {
    socket.once("secureConnect", resolve);
    socket.once("error", reject);
    socket.once("timeout", () => reject(new Error("SMTP connection timed out.")));
  });
  const greeting = await read();
  if (!greeting.startsWith("220")) throw new Error(`SMTP server unavailable (${greeting.trim().slice(0, 180)}).`);

  try {
    await command("EHLO morrow.local", 250);
    await command("AUTH LOGIN", 334);
    await command(Buffer.from(user).toString("base64"), 334);
    await command(Buffer.from(password).toString("base64"), 235);
    await command(`MAIL FROM:<${user}>`, 250);
    await command(`RCPT TO:<${input.to}>`, 250);
    await command("DATA", 354);
    const headers = [
      `From: ${from}`,
      `To: ${input.to}`,
      `Subject: ${input.subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=UTF-8",
      "",
    ].join("\r\n");
    await command(`${headers}\r\n${input.html.replace(/^\./gm, "..")}\r\n.`, 250);
    await command("QUIT", 221);
  } finally {
    socket.destroy();
  }
}

export function getVerificationUrl(token: string) {
  return `${appUrl()}/verify-email?token=${encodeURIComponent(token)}`;
}

export function getPasswordResetUrl(token: string) {
  return `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
}

export async function sendVerificationEmail(name: string, email: string, token: string) {
  const url = getVerificationUrl(token);
  return sendEmail({
    to: email,
    subject: "Verify your Morrow account",
    html: emailFrame(`<p style="font-size:14px;color:#9f3f2a;text-transform:uppercase;letter-spacing:.12em">Welcome to Morrow</p><h1 style="font-family:Georgia,serif;font-size:38px;font-weight:400;line-height:1.05">Confirm your email</h1><p style="font-size:15px;line-height:1.7;color:#57534e">Hello ${escapeHtml(name)}, verify this email address to activate your account. This link expires in 24 hours.</p><a href="${url}" style="display:inline-block;margin-top:18px;background:#211f1a;color:#fff;text-decoration:none;padding:14px 22px;font-size:14px">Verify email address</a>`),
  });
}

export async function sendPasswordResetEmail(name: string, email: string, token: string) {
  const url = getPasswordResetUrl(token);
  return sendEmail({
    to: email,
    subject: "Reset your Morrow password",
    html: emailFrame(`<p style="font-size:14px;color:#9f3f2a;text-transform:uppercase;letter-spacing:.12em">Account security</p><h1 style="font-family:Georgia,serif;font-size:38px;font-weight:400;line-height:1.05">Reset your password</h1><p style="font-size:15px;line-height:1.7;color:#57534e">Hello ${escapeHtml(name)}, use the button below to choose a new password. The link expires in 30 minutes. If you did not request this, you can ignore this email.</p><a href="${url}" style="display:inline-block;margin-top:18px;background:#211f1a;color:#fff;text-decoration:none;padding:14px 22px;font-size:14px">Choose a new password</a>`),
  });
}

export async function sendOrderConfirmationEmail(input: OrderEmailInput) {
  const itemRows = input.items
    .map((item) => `<tr><td style="padding:10px 0;border-bottom:1px solid #eee">${escapeHtml(item.productName)}</td><td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right">× ${item.quantity}</td></tr>`)
    .join("");
  return sendEmail({
    to: input.customerEmail,
    subject: `Order ${input.orderNumber} is confirmed`,
    html: emailFrame(`<p style="font-size:14px;color:#9f3f2a;text-transform:uppercase;letter-spacing:.12em">Order confirmed</p><h1 style="font-family:Georgia,serif;font-size:38px;font-weight:400;line-height:1.05">Thank you, ${escapeHtml(input.customerName.split(" ")[0] ?? input.customerName)}.</h1><p style="font-size:15px;line-height:1.7;color:#57534e">Your payment was verified and the makers are preparing your order.</p><p style="font-size:14px"><strong>${escapeHtml(input.orderNumber)}</strong></p><table style="width:100%;border-collapse:collapse;font-size:14px">${itemRows}<tr><td style="padding-top:18px"><strong>Total</strong></td><td style="padding-top:18px;text-align:right;font-size:20px;font-family:Georgia,serif"><strong>${formatCurrency(input.totalPaise / 100)}</strong></td></tr></table><a href="${appUrl()}/account" style="display:inline-block;margin-top:24px;background:#211f1a;color:#fff;text-decoration:none;padding:14px 22px;font-size:14px">View your order</a>`),
  });
}

export async function sendManualOrderPaymentEmail(input: OrderEmailInput & { paymentUrl: string }) {
  return sendEmail({
    to: input.customerEmail,
    subject: `Payment requested for order ${input.orderNumber}`,
    html: emailFrame(`<p style="font-size:14px;color:#9f3f2a;text-transform:uppercase;letter-spacing:.12em">Payment requested</p><h1 style="font-family:Georgia,serif;font-size:38px;font-weight:400;line-height:1.05">Your order is ready to pay.</h1><p style="font-size:15px;line-height:1.7;color:#57534e">Hello ${escapeHtml(input.customerName.split(" ")[0] ?? input.customerName)}, a maker has prepared order <strong>${escapeHtml(input.orderNumber)}</strong>. Use the secure payment link below to complete it.</p><p style="font-size:15px;line-height:1.7;color:#57534e">Total: <strong>${formatCurrency(input.totalPaise / 100)}</strong></p><a href="${input.paymentUrl}" style="display:inline-block;margin-top:18px;background:#211f1a;color:#fff;text-decoration:none;padding:14px 22px;font-size:14px">Pay securely</a>`),
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}
