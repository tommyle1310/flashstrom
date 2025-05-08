const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.mailtrap.io',
  port: 2525,
  auth: {
    user: '389c1523b80572', // Replace with your Mailtrap username
    pass: '9685cd52ea218d', // Replace with your Mailtrap password
  },
});

transporter.sendMail({
  from: '"NestJS" <noreply@nestjs.com>',
  to: 'tommyle1310@gmail.com', // Your recipient email
  subject: 'Test Email from Nodemailer',
  text: 'Hello from Nodemailer!',
  html: '<p>Hello from Nodemailer!</p>',
}, (error, info) => {
  if (error) {
    console.log('Error:', error);
  } else {
    console.log('Email sent:', info.response);
  }
});
