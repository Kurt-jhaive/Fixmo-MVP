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

export const sendBookingCancellationEmail = async (providerEmail, bookingDetails) => {
    const { 
        customerName, 
        serviceTitle, 
        scheduledDate, 
        appointmentId,
        cancellationReason 
    } = bookingDetails;
    
    const formattedDate = new Date(scheduledDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });

    const mailOptions = {
        from: process.env.MAILER_USER,
        to: providerEmail,
        subject: `Booking Cancellation - ${serviceTitle}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #e74c3c; margin-bottom: 20px;">Booking Cancellation Notification</h2>
                
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h3 style="margin-top: 0; color: #333;">Booking Details</h3>
                    <p><strong>Customer:</strong> ${customerName}</p>
                    <p><strong>Service:</strong> ${serviceTitle}</p>
                    <p><strong>Scheduled Date:</strong> ${formattedDate}</p>
                    <p><strong>Appointment ID:</strong> #${appointmentId}</p>
                </div>

                <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin-bottom: 20px;">
                    <h4 style="margin-top: 0; color: #856404;">Cancellation Reason</h4>
                    <p style="margin-bottom: 0; color: #856404;">${cancellationReason || 'No reason provided'}</p>
                </div>

                <p style="color: #666; margin-bottom: 20px;">
                    The customer has canceled their booking. This time slot is now available for new bookings.
                </p>

                <div style="text-align: center; margin-top: 30px;">
                    <p style="color: #888; font-size: 12px;">
                        This is an automated notification from Fixmo.<br>
                        Please do not reply to this email.
                    </p>
                </div>
            </div>
        `
    };
    
    await transporter.sendMail(mailOptions);
};
