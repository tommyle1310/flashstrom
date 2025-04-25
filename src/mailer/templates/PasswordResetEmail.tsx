import React from 'react';

interface PasswordResetEmailProps {
  logoUrl: string;
  firstName: string;
  resetLink: string;
  successLink: string;
}

const PasswordResetEmail: React.FC<PasswordResetEmailProps> = ({
  logoUrl,
  firstName,
  resetLink,
  successLink
}) => {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Reset Your Password</title>
        <style>
          {`
            body {
              font-family: 'Helvetica Neue', Arial, sans-serif;
              margin: 0;
              padding: 0;
              background-color: #f4f4f9;
              color: #333;
            }
            .container {
              width: 100%;
              max-width: 600px;
              margin: 40px auto;
              background-color: #ffffff;
              border-radius: 12px;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
              overflow: hidden;
            }
            .header {
              padding: 20px;
              text-align: center;
              border-bottom: 1px solid #e0e0e0;
            }
            .header img {
              max-width: 100px;
              height: auto;
            }
            .header h1 {
              font-size: 28px;
              font-weight: 700;
              color: #333;
              margin: 10px 0;
            }
            .content {
              padding: 30px;
              text-align: center;
            }
            .content p {
              font-size: 16px;
              line-height: 1.6;
              color: #666;
              margin: 0 0 20px;
            }
            .button {
              display: inline-block;
              padding: 14px 30px;
              font-size: 16px;
              font-weight: 600;
              color: #ffffff;
              background: linear-gradient(90deg, #4d9c39, #7dbf72);
              border-radius: 25px;
              text-decoration: none;
              transition: transform 0.2s ease, box-shadow 0.2s ease;
              box-shadow: 0 4px 10px rgba(77, 156, 57, 0.3);
            }
            .button:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 15px rgba(77, 156, 57, 0.4);
            }
            .footer {
              padding: 20px;
              text-align: center;
              font-size: 14px;
              color: #999;
              background-color: #fafafa;
              borderterr-top: 1px solid #e0e0e0;
            }
            .footer p {
              margin: 5px 0;
            }
          `}
        </style>
      </head>
      <body>
        <div className="container">
          <div className="header">
            <img src={logoUrl} alt="Logo" style={{ borderRadius: 12 }} />
            <h1>Reset your password</h1>
          </div>
          <div className="content">
            <p>Hi {firstName},</p>
            <p>
              We received a request to reset your password. Click the button
              below to create a new password:
            </p>
            <a
              style={{ color: '#fff' }}
              href={`${resetLink}&successLink=${encodeURIComponent(successLink)}`}
              className="button"
            >
              Reset Password
            </a>
            <p style={{ color: '#aaa', marginTop: 24 }}>
              If you didn't request this, you can safely ignore this email.
            </p>
            <p style={{ color: '#aaa' }}>
              After resetting your password, you'll be redirected to our success
              page.
            </p>
          </div>
          <div className="footer">
            <p>This link will expire in 1 hour.</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
        </div>
      </body>
    </html>
  );
};

export default PasswordResetEmail;
