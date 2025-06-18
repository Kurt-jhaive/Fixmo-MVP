// In-memory store for OTPs and registration data (for demo; use Redis or DB for production)
const otpStore = {};

export const saveOTP = (email, otp, registrationData) => {
    otpStore[email] = { otp, registrationData, createdAt: Date.now() };
};

export const verifyOTP = (email, otp) => {
    const record = otpStore[email];
    if (!record) return false;
    // OTP valid for 10 minutes
    if (Date.now() - record.createdAt > 10 * 60 * 1000) {
        delete otpStore[email];
        return false;
    }
    if (record.otp === otp) {
        const data = record.registrationData;
        delete otpStore[email];
        return data;
    }
    return false;
};
