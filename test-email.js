require('dotenv').config();
const sendEmail = require('./src/utils/email');

async function testEmail() {
  try {
    console.log('Sending email...');
    await sendEmail({
      email: 'alex.testing.dummy@gmail.com', // random email or the developer's email
      subject: 'Test Email',
      message: 'This is a test'
    });
    console.log('Email sent successfully!');
  } catch (err) {
    console.error('Failed to send email:', err);
  }
}

testEmail();
