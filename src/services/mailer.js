import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.MAILER_HOST,
    port: process.env.MAILER_PORT,
    secure: process.env.MAILER_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.MAILER_USER,
        pass: process.env.MAILER_PASS
    }
});

export const sendOTPEmail = async (to, otp) => {
    const mailOptions = {
        from: process.env.MAILER_USER,
        to,
        subject: 'Your OTP Code',
        text: `Your OTP code is: ${otp}`
    };
    await transporter.sendMail(mailOptions);
};

export const sendRegistrationSuccessEmail = async (to, userName) => {
    const mailOptions = {
        from: process.env.MAILER_USER,
        to,
        subject: 'Registration Successful',
        text: `Hello ${userName},\n\nYour registration was successful! Welcome aboard.\n\nBest regards,\nYour Team`
    };
    await transporter.sendMail(mailOptions);
};
