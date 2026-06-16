import nodemailer from 'nodemailer';
import { logger } from './logger.js';

// Construct the transport mechanism mapping to your explicit .env variables
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT || '587', 10), // Defaults to secure submission port 587
  secure: process.env.MAIL_PORT === '465', // True for port 465, false for other ports
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD, // Fixed: changed from 'password' to 'pass'
  },
  tls: {
    // Prevents local execution environments from crashing on self-signed certificate handshakes
    rejectUnauthorized: false,
    // Ensures connection upgrades safely over TLS channels if port 587 is selected
    requireTLS: true,
  },
});

/**
 * Dispatches a numeric multi-factor token directly to the Employee
 * @param {string} toEmail - Destination address (username)
 * @param {string} otpCode - Generated code
 */
export const sendOtpEmail = async (toEmail, otpCode) => {
  const mailOptions = {
    from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
    to: toEmail,
    subject: 'Action Required: Your Dashboard Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #1a73e8; text-align: center;">Verify Your Login Account</h2>
        <p>Please enter the following 6-digit verification code to complete your connection to the Shift Roster & Claims Dashboard:</p>
        <div style="background: #f4f4f4; padding: 15px; font-size: 28px; font-weight: bold; text-align: center; letter-spacing: 5px; color: #1a73e8; border-radius: 4px; margin: 20px 0; border: 1px dashed #1a73e8;">
          ${otpCode}
        </div>
        <p style="font-size: 12px; color: #666; text-align: center; margin-top: 25px;">
          This verification token will expire in exactly 5 minutes.<br/>
          If you did not initiate this sign-in attempt, please notify a system Administrator immediately.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`OTP transmission packet successfully dispatched to: ${toEmail}`);
  } catch (error) {
    // CRITICAL DEBUG: This prints the exact raw rejection error from Gmail straight to your terminal log console
    console.error("======= RAW SMTP ERROR ENCOUNTERED =======");
    console.error(error);
    console.error("==========================================");

    logger.error(`SMTP Dispatch Failure to ${toEmail}: ${error.message}`);
    throw new Error('Failed to deliver authentication verification email.');
  }
};

/**
 * Dispatches a success receipt to the employee who created the claim
 */
export const sendEmployeeClaimSubmissionEmail = async (employeeEmail, employeeName, claimData) => {
  const mailOptions = {
    from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
    to: employeeEmail,
    subject: 'Claim Submitted Successfully',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #28a745;">Hi ${employeeName},</h2>
        <p>Your claim has been recorded successfully and is now awaiting administrator review.</p>
        <hr style="border: 0; border-top: 1px solid #eee;" />
        <p><strong>Claim Details:</strong></p>
        <ul>
          <li><strong>Date of Shift:</strong> ${claimData.claim_date}</li>
          <li><strong>Shift Type:</strong> ${claimData.shift_type}</li>
          <li><strong>Hours Worked:</strong> ${claimData.hours_worked}</li>
          <li><strong>Overtime Hours:</strong> ${claimData.overtime_hours}</li>
        </ul>
        <p style="font-size: 12px; color: #666; margin-top: 20px;">This is an automated receipt confirmation. No further action is required from you at this time.</p>
      </div>
    `,
  };
  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Claim submission receipt dispatched to employee: ${employeeEmail}`);
  } catch (error) {
    logger.error(`Failed to send submission receipt to ${employeeEmail}: ${error.message}`);
  }
};

/**
 * Alerts administrators that a new employee claim requires evaluation
 */
export const sendAdminNewClaimAlertEmail = async (adminEmail, employeeName, claimData) => {
  const mailOptions = {
    from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
    to: adminEmail,
    subject: `🚨 Action Required: New Claim Submitted by ${employeeName}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #1a73e8;">New Claim Pending Review</h2>
        <p>An employee has submitted a new shift roster claim that requires your authorization.</p>
        <hr style="border: 0; border-top: 1px solid #eee;" />
        <p><strong>Submission Summary:</strong></p>
        <ul>
          <li><strong>Employee Name:</strong> ${employeeName}</li>
          <li><strong>Shift Date:</strong> ${claimData.claim_date}</li>
          <li><strong>Shift Classification:</strong> ${claimData.shift_type}</li>
          <li><strong>Standard / Overtime Hours:</strong> ${claimData.hours_worked} hrs / ${claimData.overtime_hours} hrs</li>
        </ul>
        <p>Please log in to your Admin Dashboard to approve or reject this request.</p>
      </div>
    `,
  };
  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Admin notification alert dispatched to: ${adminEmail}`);
  } catch (error) {
    logger.error(`Failed to send admin notification alert to ${adminEmail}: ${error.message}`);
  }
};

/**
 * Dispatches the final evaluation result directly to the target employee
 */
export const sendClaimStatusUpdateEmail = async (employeeEmail, employeeName, status, notes) => {
  const isApproved = status === 'Approved';
  const statusColor = isApproved ? '#28a745' : '#dc3545';

  const mailOptions = {
    from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
    to: employeeEmail,
    subject: `Claim Review Decision: ${status}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2>Hello ${employeeName},</h2>
        <p>The status of your shift roster claim has been updated by an administrator.</p>
        <div style="padding: 10px; font-size: 18px; font-weight: bold; color: #fff; background-color: ${statusColor}; text-align: center; border-radius: 4px; margin: 15px 0;">
          Status: ${status}
        </div>
        <p><strong>Reviewer Remarks / Feedback:</strong></p>
        <blockquote style="background: #f9f9f9; border-left: 5px solid ${statusColor}; padding: 10px 15px; margin: 10px 0; font-style: italic;">
          ${notes}
        </blockquote>
        <p style="font-size: 12px; color: #666; margin-top: 20px;">You can view full details regarding this claim and your updated payslip estimation inside your personal dashboard.</p>
      </div>
    `,
  };
  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Claim status update notification email dispatched to: ${employeeEmail}`);
  } catch (error) {
    logger.error(`Failed to send status update notification to ${employeeEmail}: ${error.message}`);
  }
};

/**
 * Dispatches a stylized HTML password reset link directly to the employee
 * @param {string} toEmail - Destination address (username/email)
 * @param {string} resetUrl - Complete frontend link containing the token parameter
 */
export const sendResetEmail = async (toEmail, resetUrl) => {
  const mailOptions = {
    from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
    to: toEmail,
    subject: 'Action Required: Reset Your Account Password',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #1a73e8; text-align: center;">Password Reset Request</h2>
        <p>We received a request to change the password for your Shift Roster System account. Click the button below to establish your new security credentials:</p>
        
        <div style="margin: 25px 0; text-align: center;">
          <a href="${resetUrl}" target="_blank" style="background-color: #1a73e8; color: #ffffff; padding: 12px 24px; font-weight: bold; font-size: 14px; text-decoration: none; border-radius: 6px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            Reset Password
          </a>
        </div>
        
        <p style="font-size: 13px; color: #555;">
          This secure authorization link is uniquely generated and will remain active for exactly <strong>1 hour</strong>.
        </p>
        <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #777; word-break: break-all;">
          If the button doesn't work, copy and paste this link into your web browser address bar:<br/>
          <a href="${resetUrl}" style="color: #1a73e8;">${resetUrl}</a>
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Password reset link successfully emailed to: ${toEmail}`);
  } catch (error) {
    console.error("======= RAW SMTP RESET ERROR =======");
    console.error(error);
    console.error("====================================");
    logger.error(`Failed to send password reset email to ${toEmail}: ${error.message}`);
    throw new Error('Failed to deliver password reset email via SMTP service.');
  }
};