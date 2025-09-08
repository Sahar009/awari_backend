import path from 'path';
import nodemailer from 'nodemailer';
import ejs from 'ejs';
import fs from 'fs';
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
    
    let html = text; // Default to text if no template
    
    // If template is provided, render EJS template
    if (template) {
      try {
        const templatePath = path.resolve(__dirname, '..', 'views', `${template}.ejs`);
        
        // Check if template file exists
        if (fs.existsSync(templatePath)) {
          html = await ejs.renderFile(templatePath, context || {});
        } else {
          console.warn(`Template file not found: ${templatePath}`);
          html = text; // Fallback to text
        }
      } catch (error) {
        console.error('Error rendering EJS template:', error);
        html = text; // Fallback to text
      }
    }
  
    const mailOptions = {
      from: {
        name: 'AWARI',
        address: process.env.SMTP_USER
      },
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      text,
      html // Use the rendered HTML instead of template/context
    }
  
    try {
      await transporter.sendMail(mailOptions)
      console.log('Email sent successfully')
      return true;
    } catch (error) {
      console.error('Error sending email:', error)
      return false;
    }
}