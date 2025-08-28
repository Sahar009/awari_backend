import twilio from 'twilio';

class WhatsAppNotificationService {
    constructor() {
        if (!WhatsAppNotificationService.instance) {
            this.initialize();
            WhatsAppNotificationService.instance = this;
        }
        return WhatsAppNotificationService.instance;
    }

    initialize() {
        this.client = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );
        this.fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    }

    formatPhoneNumber(number) {
        let cleaned = number.replace(/\D/g, '');
        
        if (cleaned.startsWith('0')) {
            cleaned = cleaned.substring(1);
        }
        
        if (!cleaned.startsWith('234')) {
            cleaned = '234' + cleaned;
        }
        
        return `whatsapp:+${cleaned}`;
    }

    async sendMessage(to, message) {
        try {
            const formattedNumber = this.formatPhoneNumber(to);
            
            const response = await this.client.messages.create({
                body: message,
                from: `whatsapp:${this.fromNumber}`,
                to: formattedNumber
            });

            console.log('WhatsApp message sent successfully:', response.sid);
            return {
                success: true,
                data: response
            };
        } catch (error) {
            console.error('WhatsApp message sending failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async sendTemplate(to, templateName, variables) {
        try {
            const template = WhatsAppTemplates[templateName];
            if (!template) {
                throw new Error('Template not found');
            }

            const message = this.compileTemplate(template, variables);
            return await this.sendMessage(to, message);
        } catch (error) {
            console.error('Template sending failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    compileTemplate(template, variables) {
        let message = template;
        Object.keys(variables).forEach(key => {
            message = message.replace(`{{${key}}}`, variables[key]);
        });
        return message;
    }
}

export const WhatsAppTemplates = {
    WELCOME: "Welcome to Nagida Foods, {{name}}! Thank you for joining our platform.",
    ORDER_UPDATE: "Your order #{{orderId}} has been {{status}}. Thank you for shopping with Nagida Foods.",
    VERIFICATION_CODE: "Your Nagida Foods verification code is: {{code}}. Valid for 30 minutes.",
    DELIVERY_UPDATE: "Your order #{{orderId}} is {{status}}. Track your delivery here: {{trackingLink}}",
    PAYMENT_CONFIRMATION: "Payment of ₦{{amount}} received for order #{{orderId}}. Thank you!"
};

export const whatsAppService = new WhatsAppNotificationService();

// Helper functions for common messages
export const sendWelcomeMessage = async (phoneNumber, name) => {
    return await whatsAppService.sendTemplate(phoneNumber, 'WELCOME', { name });
};

export const sendOrderUpdate = async (phoneNumber, orderId, status) => {
    return await whatsAppService.sendTemplate(phoneNumber, 'ORDER_UPDATE', { 
        orderId, 
        status 
    });
};

export const sendVerificationCode = async (phoneNumber, code) => {
    return await whatsAppService.sendTemplate(phoneNumber, 'VERIFICATION_CODE', { code });
};
