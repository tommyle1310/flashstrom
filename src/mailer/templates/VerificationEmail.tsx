import React from 'react';

interface VerificationEmailProps {
  logoUrl: string;
  verificationCode: string;
}

const VerificationEmail: React.FC<VerificationEmailProps> = ({
  logoUrl,
  verificationCode
}) => {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Email Verification</title>
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
            .verification-code {
              display: inline-block;
              padding: 14px 30px;
              font-size: 24px;
              font-weight: 600;
              color: #ffffff;
              background: linear-gradient(90deg, #4d9c39, #7dbf72);
              border-radius: 25px;
              margin: 20px 0;
              box-shadow: 0 4px 10px rgba(77, 156, 57, 0.3);
            }
            .footer {
              padding: 20px;
              text-align: center;
              font-size: 14px;
              color: #999;
              background-color: #fafafa;
              border-top: 1px solid #e0e0e0;
            }
            .footer p {
              margin: 5px 0;
            }
            .footer a {
              color: #4d9c39;
              text-decoration: none;
            }
            .footer a:hover {
              text-decoration: underline;
            }
          `}
        </style>
      </head>
      <body>
        <div className="container">
          <div className="header">
            <img src={logoUrl} alt="Logo" />
            <h1>Verify Your Email</h1>
          </div>
          <div className="content">
            <p>Hi there,</p>
            <p>
              Thank you for signing up! To complete your account creation,
              please verify your email by entering the code below:
            </p>
            <p style={{ color: '#fff' }} className="verification-code">
              {verificationCode}
            </p>
            <p style={{ marginTop: '2rem', color: '#aaa' }}>
              If you didn’t request this, you can ignore this email.
            </p>
          </div>
          <div className="footer">
            <p>Flashfood team</p>
            <p>
              <a href="mailto:support@flashfood.com">Contact Support</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  );
};

export default VerificationEmail;
