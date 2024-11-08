// utils/sendOtp.ts
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

export const sendOTP = async (phone: string, otp: Number) => {
  return client.messages.create({
    body: `Your verification code is ${otp}`,
    from: twilioPhone,
    to: phone,
  });
};
