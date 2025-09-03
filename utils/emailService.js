const nodemailer = require("nodemailer");
const QRCode = require("qrcode");
const cloudinary = require("cloudinary").v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Generate QR code for registration verification
async function generateQRCode(registrationId) {
  try {
    const verificationUrl = `${
      process.env.BASE_URL || "http://localhost:3000"
    }/verify/${registrationId}`;

    // Generate QR code as PNG buffer
    const qrCodeBuffer = await QRCode.toBuffer(verificationUrl, {
      type: "image/png",
      width: 300,
      margin: 2,
      color: {
        dark: "#2d8659",
        light: "#ffffff",
      },
    });

    // Convert buffer to base64
    const base64Image = qrCodeBuffer.toString("base64");
    const dataURI = `data:image/png;base64,${base64Image}`;

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(dataURI, {
      folder: "qr-codes",
      public_id: registrationId,
      overwrite: true,
      resource_type: "image",
      transformation: [
        { width: 300, height: 300, crop: "fill" },
        { quality: "auto" },
      ],
    });

    // Return Cloudinary URL
    return uploadResult.secure_url;
  } catch (error) {
    console.error("QR code generation failed:", error);
    return null;
  }
}

// Create transporter with your SMTP settings
const transporter = nodemailer.createTransport({
  host: "mail.accessviewafrica.com",
  port: 465,
  secure: true, // Use SSL/TLS
  auth: {
    user: process.env.EMAIL_USER || "valuecreationsummit@accessviewafrica.com",
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false, // For self-signed certificates if needed
  },
});

// Email templates
const emailTemplates = {
  paymentSuccess: (data) => ({
    subject: `Registration Confirmation - ${data.eventName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #2d8659, #44b678); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Registration Confirmation</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Value Creation Summit 2025</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #2d8659; margin-top: 0;">Registration Confirmed!</h2>
          
          <p>Dear <strong>${data.customerName}</strong>,</p>
          
          <p>Thank you for registering for the <strong>${
            data.eventName
          }</strong>, part of the Value Creation Summit 2025. Your payment has been successfully processed and your registration is confirmed.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #44b678;">
            <h3 style="color: #2d8659; margin-top: 0;">Event Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #666;">Event:</td>
                <td style="padding: 8px 0;">${data.eventName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #666;">Date:</td>
                <td style="padding: 8px 0;">${
                  data.eventDate || "September 9, 2025"
                }</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #666;">Location:</td>
                <td style="padding: 8px 0;">${
                  data.eventLocation || "Accra City Hotel"
                }</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #666;">Transaction ID:</td>
                <td style="padding: 8px 0; font-family: monospace;">${
                  data.clientReference
                }</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #666;">Amount Paid:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #2d8659;">GHS ${
                  data.amount
                }</td>
              </tr>
            </table>
          </div>
          
                    <div style="text-align: center; margin: 30px 0; background: white; padding: 20px; border-radius: 8px;">
            <h4 style="color: #2d8659; margin-top: 0;">Your Entry QR Code</h4>
            <img src="${
              data.qrCode
            }" alt="Registration QR Code" style="max-width: 200px; border: 2px solid #ddd; border-radius: 8px;">
            <p style="font-size: 12px; color: #666; margin-top: 10px;">Present this QR code at the event entrance</p>
          </div>
          
          <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #2d8659; margin-top: 0;">Important Information</h4>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Please arrive 30 minutes before the event starts</li>
              <li>Bring a valid ID for verification</li>
              <li>Keep this email and QR code for your records</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #666; font-size: 14px;">
              For assistance, kindly reach us at <a href="mailto:nakunyili@accessviewafrica.com" style="color: #44b678;">nakunyili@accessviewafrica.com</a> or +233 240 509 803.
            </p>
            <p style="color: #666; font-size: 12px;">
              We look forward to welcoming you to the event!<br><br>
              Best regards,<br>
              Access View Africa Team
            </p>
          </div>
        </div>
      </div>
    `,
  }),

  paymentFailed: (data) => ({
    subject: `Payment Failed - ${data.eventName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #e74c3c, #c0392b); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Payment Failed</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Value Creation Summit 2025</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #e74c3c; margin-top: 0;">Payment Processing Issue</h2>
          
          <p>Dear <strong>${data.customerName}</strong>,</p>
          
          <p>We encountered an issue processing your payment for the <strong>${data.eventName}</strong>. Your registration is currently pending.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e74c3c;">
            <h3 style="color: #e74c3c; margin-top: 0;">Transaction Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #666;">Event:</td>
                <td style="padding: 8px 0;">${data.eventName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #666;">Amount:</td>
                <td style="padding: 8px 0;">${data.amount}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #666;">Date:</td>
                <td style="padding: 8px 0;">${data.paymentDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #666;">Reference:</td>
                <td style="padding: 8px 0;">${data.clientReference}</td>
              </tr>
            </table>
          </div>
          
          <p>Please try again or contact our support team if the issue persists. Your registration details have been saved and you can attempt payment again.</p>
          
          <p>If you have any questions, please don't hesitate to contact us.</p>
          
          <p>Best regards,<br>
          <strong>Value Creation Summit Team</strong></p>
        </div>
      </div>
    `,
  }),

  paymentReminder: (data) => ({
    subject: `Payment Reminder - ${data.eventName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #e67e22, #f39c12); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Payment Reminder</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Value Creation Summit 2025</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #e67e22; margin-top: 0;">Complete Your Registration</h2>
          
          <p>Dear <strong>${data.customerName}</strong>,</p>
          
          <p>We noticed that your registration for the <strong>${
            data.eventName
          }</strong> is incomplete. Your payment has not been processed yet.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e67e22;">
            <h3 style="color: #e67e22; margin-top: 0;">Event Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #666;">Event:</td>
                <td style="padding: 8px 0;">${data.eventName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #666;">Date:</td>
                <td style="padding: 8px 0;">${
                  data.eventDate || "September 9, 2025"
                }</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #666;">Location:</td>
                <td style="padding: 8px 0;">${
                  data.eventLocation || "Accra City Hotel"
                }</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #666;">Price:</td>
                <td style="padding: 8px 0;">${data.eventPrice}</td>
              </tr>
            </table>
          </div>
          
          <p><strong>To complete your registration and secure your spot, please click the button below:</strong></p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${
              data.registrationLink
            }" style="background: linear-gradient(135deg, #e67e22, #f39c12); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
              Complete Payment Now
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666; text-align: center;">
            Or copy and paste this link: <br>
            <a href="${data.registrationLink}" style="color: #e67e22;">${
      data.registrationLink
    }</a>
          </p>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #856404;">
              <strong>Note:</strong> Your form details have been saved and will be pre-filled when you visit the link above. You can proceed directly to payment without re-entering your information.
            </p>
          </div>
          
          <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>
          
          <p>Best regards,<br>
          <strong>Value Creation Summit Team</strong></p>
        </div>
      </div>
    `,
  }),
};

// Send email function
async function sendEmail(to, template, data) {
  console.log("📧 sendEmail function called");
  console.log("📧 To:", to);
  console.log("📧 Template:", template);
  console.log("📧 Data keys:", Object.keys(data));

  try {
    // Verify transporter configuration
    if (!process.env.EMAIL_PASSWORD) {
      console.error("❌ EMAIL_PASSWORD environment variable is not set");
      throw new Error("EMAIL_PASSWORD environment variable is not set");
    }

    console.log("📧 Environment variables check:");
    console.log(
      "  - EMAIL_USER:",
      process.env.EMAIL_USER || "Not set (using default)"
    );
    console.log(
      "  - EMAIL_PASSWORD:",
      process.env.EMAIL_PASSWORD ? "Set" : "Not set"
    );
    console.log(
      "  - CLOUDINARY_CLOUD_NAME:",
      process.env.CLOUDINARY_CLOUD_NAME ? "Set" : "Not set"
    );

    const emailContent = emailTemplates[template](data);
    console.log("📧 Email template generated successfully");
    console.log("📧 Subject:", emailContent.subject);
    console.log("📧 HTML length:", emailContent.html.length, "characters");

    const mailOptions = {
      from: `"Value Creation Summit" <${
        process.env.EMAIL_USER || "valuecreationsummit@accessviewafrica.com"
      }>`,
      to: to,
      subject: emailContent.subject,
      html: emailContent.html,
    };

    console.log("📧 Mail options prepared:");
    console.log("  - From:", mailOptions.from);
    console.log("  - To:", mailOptions.to);
    console.log("  - Subject:", mailOptions.subject);

    console.log("📧 Attempting to send email via SMTP...");
    console.log("📧 SMTP Host: mail.accessviewafrica.com");
    console.log("📧 SMTP Port: 465");
    console.log("📧 SMTP Secure: true");

    const result = await transporter.sendMail(mailOptions);

    console.log("✅ Email sent successfully via SMTP!");
    console.log("✅ SMTP Response:", result);
    console.log("✅ Message ID:", result.messageId);
    console.log("✅ Accepted recipients:", result.accepted);
    console.log("✅ Rejected recipients:", result.rejected);

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("❌ Email sending failed:");
    console.error("❌ Error message:", error.message);
    console.error("❌ Error code:", error.code);
    console.error("❌ Error command:", error.command);
    console.error("❌ Error response:", error.response);
    console.error("❌ Error responseCode:", error.responseCode);
    console.error("❌ Full error object:", error);

    return { success: false, error: error.message };
  }
}

// Send payment confirmation email
async function sendPaymentConfirmation(registrationData, paymentData) {
  // Generate QR code for registration verification
  const qrCode = await generateQRCode(registrationData.clientReference);

  // Handle different payment data structures
  let amount = paymentData.amount;
  if (!amount && paymentData.Amount) {
    amount = paymentData.Amount; // Hubtel callback structure
  }

  const emailData = {
    customerName: registrationData.customerInfo.fullName,
    eventName: registrationData.eventName,
    clientReference: registrationData.clientReference,
    amount: amount,
    eventDate: registrationData.eventDate || "September 9, 2025",
    eventLocation: registrationData.eventLocation || "Accra City Hotel",
    qrCode: qrCode,
  };

  return await sendEmail(
    registrationData.customerInfo.email,
    "paymentSuccess",
    emailData
  );
}

// Send payment failure email
async function sendPaymentFailure(registrationData, paymentData) {
  // Handle different payment data structures
  let amount = paymentData.amount;
  if (!amount && paymentData.Amount) {
    amount = paymentData.Amount; // Hubtel callback structure
  }

  const emailData = {
    customerName: registrationData.customerInfo.fullName,
    eventName: registrationData.eventName,
    clientReference: registrationData.clientReference,
    amount: amount,
    paymentDate: new Date().toLocaleDateString("en-GH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };

  return await sendEmail(
    registrationData.customerInfo.email,
    "paymentFailed",
    emailData
  );
}

// Send payment reminder email
async function sendPaymentReminder(registrationData) {
  console.log("📧 Starting payment reminder email process...");
  console.log("📧 Registration data:", {
    clientReference: registrationData.clientReference,
    customerName: registrationData.customerInfo.fullName,
    customerEmail: registrationData.customerInfo.email,
    eventType: registrationData.eventType,
    eventName: registrationData.eventName,
    paymentStatus: registrationData.paymentStatus,
  });

  try {
    // Create registration link with all customer details as GET parameters
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";
    console.log("📧 Base URL:", baseUrl);

    // Build URL with all customer details
    const params = new URLSearchParams({
      event: registrationData.eventType,
      ref: registrationData.clientReference,
      fullName: registrationData.customerInfo.fullName,
      email: registrationData.customerInfo.email,
      phone: registrationData.customerInfo.phone,
      organization: registrationData.customerInfo.organization,
      agiMember: registrationData.customerInfo.agiMember ? "true" : "false",
      eventName: registrationData.eventName,
      eventPrice: registrationData.eventPrice,
      eventDate: registrationData.eventDate || "September 9, 2025",
      eventLocation: registrationData.eventLocation || "Accra City Hotel",
    });

    const registrationLink = `${baseUrl}/register?${params.toString()}`;
    console.log("📧 Generated registration link:", registrationLink);

    const emailData = {
      customerName: registrationData.customerInfo.fullName,
      eventName: registrationData.eventName,
      eventDate: registrationData.eventDate || "September 9, 2025",
      eventLocation: registrationData.eventLocation || "Accra City Hotel",
      eventPrice: registrationData.eventPrice,
      registrationLink: registrationLink,
    };

    console.log("📧 Email data prepared:", emailData);
    console.log(
      "📧 Attempting to send email to:",
      registrationData.customerInfo.email
    );

    // Check email configuration
    console.log("📧 Email configuration check:");
    console.log("  - EMAIL_USER:", process.env.EMAIL_USER ? "Set" : "Not set");
    console.log(
      "  - EMAIL_PASSWORD:",
      process.env.EMAIL_PASSWORD ? "Set" : "Not set"
    );
    console.log("  - SMTP Host: mail.accessviewafrica.com");
    console.log("  - SMTP Port: 465");
    console.log("  - SMTP Secure: true");

    const result = await sendEmail(
      registrationData.customerInfo.email,
      "paymentReminder",
      emailData
    );

    console.log("📧 Email send result:", result);

    if (result.success) {
      console.log("✅ Payment reminder email sent successfully!");
      console.log("✅ Message ID:", result.messageId);
      console.log("✅ Sent to:", registrationData.customerInfo.email);
    } else {
      console.error("❌ Failed to send payment reminder email");
      console.error("❌ Error:", result.error);
    }

    return result;
  } catch (error) {
    console.error("❌ Error in sendPaymentReminder function:", error);
    console.error("❌ Error stack:", error.stack);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendEmail,
  sendPaymentConfirmation,
  sendPaymentFailure,
  sendPaymentReminder,
  generateQRCode,
};
