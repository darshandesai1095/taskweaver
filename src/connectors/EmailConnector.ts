import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';

// Custom Error for Email Connector
export class EmailConnectorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmailConnectorError';
  }
}

// Interface for Email Connector options
interface EmailConnectorOptions {
  service?: string; // e.g., 'gmail', optional for custom SMTP setup
  host?: string; // For custom SMTP server
  port?: number; // SMTP port (e.g., 587 for TLS)
  secure?: boolean; // Use SSL or TLS
  auth: {
    user: string; // Your email address or username
    pass: string; // Your email password or an app-specific password
  };
  // Optional OAuth2 configuration
  oauth2?: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
  };
}

// Define the structure for the Email Connector
export class EmailConnector {
  private transporter?: Transporter;

  constructor(private options: EmailConnectorOptions) {
    // Initialize transporter based on service or custom SMTP setup
    if (this.options.service) {
      this.transporter = nodemailer.createTransport({
        service: this.options.service,
        auth: this.options.auth,
      });
    } else if (this.options.host && this.options.port) {
      this.transporter = nodemailer.createTransport({
        host: this.options.host,
        port: this.options.port,
        secure: this.options.secure || false, // Use TLS or SSL
        auth: this.options.auth,
      });
    } else if (this.options.oauth2) {
      // Use OAuth2 if provided
      this.transporter = nodemailer.createTransport({
        service: 'gmail', // Example for Gmail, can be modified as needed
        auth: {
          type: 'OAuth2',
          user: this.options.auth.user,
          clientId: this.options.oauth2.clientId,
          clientSecret: this.options.oauth2.clientSecret,
          refreshToken: this.options.oauth2.refreshToken,
        },
      });
    } else {
      throw new EmailConnectorError('Invalid email configuration.');
    }
  }

  // Send an email
  public async sendEmail(
    to: string,
    subject: string,
    text: string,
    html?: string,
    attachments?: any[]
  ): Promise<void> {
    if (!this.transporter) {
      throw new EmailConnectorError('Email transporter is not initialized.');
    }

    const mailOptions: SendMailOptions = {
      from: this.options.auth.user,
      to,
      subject,
      text,
      html,
      attachments,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent:', info.response);
    } catch (error) {
      throw new EmailConnectorError(`Failed to send email: ${error instanceof Error ? error.message : error}`);
    }
  }

  // Send a plain text email
  public async sendPlainTextEmail(
    to: string,
    subject: string,
    text: string,
    attachments?: any[]
  ): Promise<void> {
    await this.sendEmail(to, subject, text, undefined, attachments);
  }

  // Send an HTML email
  public async sendHtmlEmail(
    to: string,
    subject: string,
    html: string,
    attachments?: any[]
  ): Promise<void> {
    await this.sendEmail(to, subject, '', html, attachments);
  }

  // Send email with attachments
  public async sendEmailWithAttachments(
    to: string,
    subject: string,
    text: string,
    html?: string,
    attachments?: any[]
  ): Promise<void> {
    await this.sendEmail(to, subject, text, html, attachments);
  }
}
