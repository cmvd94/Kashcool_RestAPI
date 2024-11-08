// utils/emailHelper.ts
import sgMail from '@sendgrid/mail';



interface EmailParams {
    to: string;
    name: string;
    subject: string;
    text: string;
    html: string;
}

export const sendEmail = async ({ to, name, subject, text, html }: EmailParams) => {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!); // Make sure to set your API key in environment variables
    console.log("inside sendmail")
    const msg = {
        to,
        from: process.env.Domain_ADMIN_EMAIL!, // Your verified sender email
    subject,
    text,
    html,
  };

  try {
    await sgMail.send(msg);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Email sending failed");
  }
};
