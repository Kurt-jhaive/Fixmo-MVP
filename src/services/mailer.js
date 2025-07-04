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

// 1. BOOKING CONFIRMATION - Send to Customer
export const sendBookingConfirmationToCustomer = async (customerEmail, bookingDetails) => {
    const { 
        customerName, 
        serviceTitle, 
        providerName,
        providerPhone,
        providerEmail,
        scheduledDate, 
        appointmentId,
        startingPrice,
        repairDescription
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
        to: customerEmail,
        subject: `Booking Confirmation - ${serviceTitle}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #28a745; margin-bottom: 10px;">✅ Booking Confirmed!</h1>
                        <p style="color: #666; font-size: 16px;">Your service appointment has been successfully booked</p>
                    </div>
                    
                    <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #28a745;">
                        <h3 style="margin-top: 0; color: #155724;">Booking Details</h3>
                        <p><strong>Booking ID:</strong> #${appointmentId}</p>
                        <p><strong>Customer:</strong> ${customerName}</p>
                        <p><strong>Service:</strong> ${serviceTitle}</p>
                        <p><strong>Scheduled Date:</strong> ${formattedDate}</p>
                        <p><strong>Starting Price:</strong> ₱${startingPrice ? startingPrice.toFixed(2) : 'TBD'}</p>
                        ${repairDescription ? `<p><strong>Description:</strong> ${repairDescription}</p>` : ''}
                    </div>

                    <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #ffc107;">
                        <h3 style="margin-top: 0; color: #856404;">Service Provider Details</h3>
                        <p><strong>Provider:</strong> ${providerName}</p>
                        <p><strong>Phone:</strong> ${providerPhone}</p>
                        <p><strong>Email:</strong> ${providerEmail}</p>
                    </div>

                    <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h3 style="margin-top: 0; color: #155724;">Next Steps</h3>
                        <ul style="margin: 0; padding-left: 20px; color: #155724;">
                            <li>Your service provider will contact you to confirm the appointment</li>
                            <li>The final price will be determined after the service assessment</li>
                            <li>You can track your booking status in your dashboard</li>
                            <li>Please be available at the scheduled time</li>
                        </ul>
                    </div>

                    <div style="text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin-top: 30px;">
                        <p style="color: #666; margin-bottom: 10px;">Need help? Contact us:</p>
                        <p style="color: #007bff; margin: 0;">support@fixmo.com</p>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #888; font-size: 12px;">
                            This is an automated confirmation from Fixmo.<br>
                            Please do not reply to this email.
                        </p>
                    </div>
                </div>
            </div>
        `
    };
    
    await transporter.sendMail(mailOptions);
};

// 1. BOOKING CONFIRMATION - Send to Service Provider
export const sendBookingConfirmationToProvider = async (providerEmail, bookingDetails) => {
    const { 
        customerName, 
        customerPhone,
        customerEmail,
        serviceTitle, 
        providerName,
        scheduledDate, 
        appointmentId,
        startingPrice,
        repairDescription
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
        subject: `New Booking Received - ${serviceTitle}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #007bff; margin-bottom: 10px;">🔔 New Booking Received!</h1>
                        <p style="color: #666; font-size: 16px;">You have a new service appointment</p>
                    </div>
                    
                    <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #007bff;">
                        <h3 style="margin-top: 0; color: #0056b3;">Booking Details</h3>
                        <p><strong>Booking ID:</strong> #${appointmentId}</p>
                        <p><strong>Service:</strong> ${serviceTitle}</p>
                        <p><strong>Scheduled Date:</strong> ${formattedDate}</p>
                        <p><strong>Starting Price:</strong> ₱${startingPrice ? startingPrice.toFixed(2) : 'TBD'}</p>
                        ${repairDescription ? `<p><strong>Service Description:</strong> ${repairDescription}</p>` : ''}
                    </div>

                    <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #ffc107;">
                        <h3 style="margin-top: 0; color: #856404;">Customer Information</h3>
                        <p><strong>Customer:</strong> ${customerName}</p>
                        <p><strong>Phone:</strong> ${customerPhone}</p>
                        <p><strong>Email:</strong> ${customerEmail}</p>
                    </div>

                    <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h3 style="margin-top: 0; color: #155724;">Action Required</h3>
                        <ul style="margin: 0; padding-left: 20px; color: #155724;">
                            <li>Contact the customer to confirm the appointment details</li>
                            <li>Assess the service requirements and provide final pricing</li>
                            <li>Update the booking status in your dashboard</li>
                            <li>Prepare for the scheduled appointment</li>
                        </ul>
                    </div>

                    <div style="text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin-top: 30px;">
                        <p style="color: #666; margin-bottom: 10px;">Manage your bookings:</p>
                        <p style="color: #007bff; margin: 0;">Login to your provider dashboard</p>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #888; font-size: 12px;">
                            This is an automated notification from Fixmo.<br>
                            Please do not reply to this email.
                        </p>
                    </div>
                </div>
            </div>
        `
    };
    
    await transporter.sendMail(mailOptions);
};

// 2. BOOKING CANCELLATION - Send to Customer
export const sendBookingCancellationToCustomer = async (customerEmail, bookingDetails) => {
    const { 
        customerName, 
        serviceTitle, 
        providerName,
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
        to: customerEmail,
        subject: `Booking Cancellation Confirmed - ${serviceTitle}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #e74c3c; margin-bottom: 10px;">❌ Booking Cancelled</h1>
                        <p style="color: #666; font-size: 16px;">Your booking has been successfully cancelled</p>
                    </div>
                    
                    <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #e74c3c;">
                        <h3 style="margin-top: 0; color: #721c24;">Cancelled Booking Details</h3>
                        <p><strong>Booking ID:</strong> #${appointmentId}</p>
                        <p><strong>Customer:</strong> ${customerName}</p>
                        <p><strong>Service:</strong> ${serviceTitle}</p>
                        <p><strong>Provider:</strong> ${providerName}</p>
                        <p><strong>Scheduled Date:</strong> ${formattedDate}</p>
                    </div>

                    <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #ffc107;">
                        <h3 style="margin-top: 0; color: #856404;">Cancellation Reason</h3>
                        <p style="margin-bottom: 0; color: #856404;">${cancellationReason || 'No reason provided'}</p>
                    </div>

                    <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h3 style="margin-top: 0; color: #155724;">What's Next?</h3>
                        <ul style="margin: 0; padding-left: 20px; color: #155724;">
                            <li>Your booking has been cancelled and the provider has been notified</li>
                            <li>You can book a new service anytime from your dashboard</li>
                            <li>No charges will be applied for this cancellation</li>
                            <li>Thank you for using Fixmo</li>
                        </ul>
                    </div>

                    <div style="text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin-top: 30px;">
                        <p style="color: #666; margin-bottom: 10px;">Need help? Contact us:</p>
                        <p style="color: #007bff; margin: 0;">support@fixmo.com</p>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #888; font-size: 12px;">
                            This is an automated confirmation from Fixmo.<br>
                            Please do not reply to this email.
                        </p>
                    </div>
                </div>
            </div>
        `
    };
    
    await transporter.sendMail(mailOptions);
};

// 2. BOOKING CANCELLATION - Send to Service Provider (Already exists, keeping it)
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

// 3. BOOKING COMPLETION - Send to Customer
export const sendBookingCompletionToCustomer = async (customerEmail, bookingDetails) => {
    const { 
        customerName, 
        serviceTitle, 
        providerName,
        scheduledDate, 
        appointmentId,
        finalPrice,
        startingPrice
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
        to: customerEmail,
        subject: `Service Completed - ${serviceTitle}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #28a745; margin-bottom: 10px;">✅ Service Completed!</h1>
                        <p style="color: #666; font-size: 16px;">Your service has been successfully completed</p>
                    </div>
                    
                    <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #28a745;">
                        <h3 style="margin-top: 0; color: #155724;">Service Details</h3>
                        <p><strong>Booking ID:</strong> #${appointmentId}</p>
                        <p><strong>Customer:</strong> ${customerName}</p>
                        <p><strong>Service:</strong> ${serviceTitle}</p>
                        <p><strong>Provider:</strong> ${providerName}</p>
                        <p><strong>Completed Date:</strong> ${formattedDate}</p>
                    </div>

                    <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #007bff;">
                        <h3 style="margin-top: 0; color: #0056b3;">Pricing Summary</h3>
                        <p><strong>Starting Price:</strong> ₱${startingPrice ? startingPrice.toFixed(2) : 'N/A'}</p>
                        <p><strong>Final Price:</strong> ₱${finalPrice ? finalPrice.toFixed(2) : 'To be determined'}</p>
                        ${finalPrice ? `<p style="color: #28a745;"><strong>Total Amount:</strong> ₱${finalPrice.toFixed(2)}</p>` : ''}
                    </div>

                    <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h3 style="margin-top: 0; color: #856404;">What's Next?</h3>
                        <ul style="margin: 0; padding-left: 20px; color: #856404;">
                            <li>Please rate your experience with the service provider</li>
                            <li>Process payment with the service provider directly</li>
                            <li>Keep this email for your records</li>
                            <li>Book another service anytime from your dashboard</li>
                        </ul>
                    </div>

                    <div style="text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin-top: 30px;">
                        <p style="color: #666; margin-bottom: 10px;">Thank you for using Fixmo!</p>
                        <p style="color: #007bff; margin: 0;">support@fixmo.com</p>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #888; font-size: 12px;">
                            This is an automated confirmation from Fixmo.<br>
                            Please do not reply to this email.
                        </p>
                    </div>
                </div>
            </div>
        `
    };
    
    await transporter.sendMail(mailOptions);
};

// 3. BOOKING COMPLETION - Send to Service Provider
export const sendBookingCompletionToProvider = async (providerEmail, bookingDetails) => {
    const { 
        customerName, 
        serviceTitle, 
        providerName,
        scheduledDate, 
        appointmentId,
        finalPrice,
        startingPrice
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
        subject: `Service Completion Confirmed - ${serviceTitle}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #28a745; margin-bottom: 10px;">🎉 Service Completed!</h1>
                        <p style="color: #666; font-size: 16px;">Great job completing the service!</p>
                    </div>
                    
                    <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #28a745;">
                        <h3 style="margin-top: 0; color: #155724;">Completed Service Details</h3>
                        <p><strong>Booking ID:</strong> #${appointmentId}</p>
                        <p><strong>Service:</strong> ${serviceTitle}</p>
                        <p><strong>Customer:</strong> ${customerName}</p>
                        <p><strong>Provider:</strong> ${providerName}</p>
                        <p><strong>Completed Date:</strong> ${formattedDate}</p>
                    </div>

                    <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #007bff;">
                        <h3 style="margin-top: 0; color: #0056b3;">Pricing Information</h3>
                        <p><strong>Starting Price:</strong> ₱${startingPrice ? startingPrice.toFixed(2) : 'N/A'}</p>
                        <p><strong>Final Price:</strong> ₱${finalPrice ? finalPrice.toFixed(2) : 'To be determined'}</p>
                        ${finalPrice ? `<p style="color: #28a745;"><strong>Service Fee:</strong> ₱${finalPrice.toFixed(2)}</p>` : ''}
                    </div>

                    <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h3 style="margin-top: 0; color: #856404;">Payment & Next Steps</h3>
                        <ul style="margin: 0; padding-left: 20px; color: #856404;">
                            <li>The customer has been notified of the completion</li>
                            <li>Process payment with the customer directly</li>
                            <li>The customer may rate and review your service</li>
                            <li>Keep this email for your records</li>
                        </ul>
                    </div>

                    <div style="text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin-top: 30px;">
                        <p style="color: #666; margin-bottom: 10px;">Thank you for providing excellent service!</p>
                        <p style="color: #007bff; margin: 0;">Keep up the great work!</p>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #888; font-size: 12px;">
                            This is an automated confirmation from Fixmo.<br>
                            Please do not reply to this email.
                        </p>
                    </div>
                </div>
            </div>
        `
    };
    
    await transporter.sendMail(mailOptions);
};
