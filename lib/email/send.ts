import nodemailer from 'nodemailer'

let transporter: nodemailer.Transporter | null = null

function getEmailAuth(): { user: string; pass: string } | null {
  const user = process.env.GMAIL_USER || process.env.EMAIL_USER
  const pass = process.env.GMAIL_PASS || process.env.EMAIL_PASSWORD

  if (!user || !pass) return null

  return { user, pass }
}

function getTransporter(auth: { user: string; pass: string }): nodemailer.Transporter {
  if (transporter) return transporter

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth,
  })

  return transporter
}

export interface SendEmailOptions {
  to: string
  subject: string
  text?: string
  html?: string
}

export async function sendEmail({ to, subject, text, html }: SendEmailOptions) {
  try {
    const auth = getEmailAuth()

    if (!auth) {
      throw new Error(
        'Email credentials are not configured. Set GMAIL_USER/GMAIL_PASS (or EMAIL_USER/EMAIL_PASSWORD).'
      )
    }

    const from = process.env.EMAIL_FROM || auth.user

    await getTransporter(auth).sendMail({
      from,
      to,
      subject,
      text,
      html,
    })
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}
