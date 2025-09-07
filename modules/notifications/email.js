import hbs from 'nodemailer-express-handlebars';
import path from 'path';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// nodemailer setup
const createTransporter = () => {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false 
      }
    })
}

// Changed the function signature to accept an object with named parameters
export const sendEmail = async (to, subject, text, template, context) => {
    const transporter = createTransporter()
  
    const hbsOptions = {
      viewEngine: {
        extName: '.ejs',
        partialsDir: path.resolve(__dirname, '..', 'views'), 
        layoutsDir: path.resolve(__dirname, '..', 'views'), 
        defaultLayout: false,
      },
      viewPath: path.resolve(__dirname, '..', 'views'),
      extName: '.ejs',
    }
  
    transporter.use('compile', hbs(hbsOptions))
  
    const mailOptions = {
      from: {
        name: 'AWARI',
        address: process.env.SMTP_USER
      },
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      text,
      template,
      context
    }
  
    try {
      await transporter.sendMail(mailOptions)
      console.log('Email sent successfully')
      return true;
    } catch (error) {
      console.error('Error sending email:', error)
    }
}