import PDFDocument from 'pdfkit';
import Booking from '../schema/Booking.js';
import Property from '../schema/Property.js';
import User from '../schema/User.js';

/**
 * Generate booking receipt PDF
 * @param {string} bookingId - Booking ID
 * @param {string} userId - User ID requesting the receipt
 * @returns {Promise<Buffer>} PDF buffer
 */
export const generateBookingReceiptPDF = async (bookingId, userId) => {
  try {
    // Fetch booking with all related data
    const booking = await Booking.findOne({
      where: { id: bookingId },
      include: [
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'title', 'address', 'city', 'state', 'country', 'propertyType', 'listingType'],
          include: [
            {
              model: User,
              as: 'owner',
              attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
            }
          ]
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        }
      ]
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    // Verify user has access to this booking
    if (booking.userId !== userId && booking.ownerId !== userId) {
      throw new Error('Unauthorized access to booking');
    }

    // Create PDF document
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];

    // Collect PDF data
    doc.on('data', (chunk) => chunks.push(chunk));

    // Generate PDF content
    await generatePDFContent(doc, booking);

    // Finalize PDF
    doc.end();

    // Return promise that resolves with buffer
    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);
    });
  } catch (error) {
    console.error('Error generating booking receipt PDF:', error);
    throw error;
  }
};

/**
 * Generate PDF content
 * @param {PDFDocument} doc - PDF document instance
 * @param {Object} booking - Booking data with relations
 */
async function generatePDFContent(doc, booking) {
  const pageWidth = doc.page.width - 100; // Account for margins

  // Header
  doc.fontSize(24).font('Helvetica-Bold').text('BOOKING RECEIPT', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica').fillColor('#666666')
    .text(`Booking ID: ${booking.id}`, { align: 'center' });
  doc.moveDown(0.3);
  doc.text(`Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });
  
  // Line separator
  doc.moveDown(1);
  doc.strokeColor('#000000').lineWidth(1)
    .moveTo(50, doc.y).lineTo(pageWidth + 50, doc.y).stroke();
  doc.moveDown(1);

  // Booking Status
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000').text('Booking Status');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica').fillColor('#333333')
    .text(`Status: ${booking.status.toUpperCase()}`, { continued: true })
    .fillColor('#666666')
    .text(`     Payment: ${booking.paymentStatus.toUpperCase()}`);
  doc.moveDown(1);

  // Property Information
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000').text('Property Information');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica').fillColor('#333333');
  
  if (booking.property) {
    doc.text(`Property: ${booking.property.title}`);
    doc.text(`Type: ${booking.property.propertyType} - ${booking.property.listingType}`);
    doc.text(`Address: ${booking.property.address}, ${booking.property.city}, ${booking.property.state}, ${booking.property.country}`);
  }
  doc.moveDown(1);

  // Booking Details
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000').text('Booking Details');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica').fillColor('#333333');
  
  doc.text(`Booking Type: ${booking.bookingType.replace('_', ' ').toUpperCase()}`);
  
  if (booking.bookingType === 'sale_inspection') {
    if (booking.inspectionDate) {
      doc.text(`Inspection Date: ${new Date(booking.inspectionDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
    }
    if (booking.inspectionTime) {
      doc.text(`Inspection Time: ${booking.inspectionTime}`);
    }
  } else {
    if (booking.checkInDate) {
      doc.text(`Check-in: ${new Date(booking.checkInDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
    }
    if (booking.checkOutDate) {
      doc.text(`Check-out: ${new Date(booking.checkOutDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
    }
    if (booking.numberOfNights) {
      doc.text(`Duration: ${booking.numberOfNights} night(s)`);
    }
  }
  
  if (booking.numberOfGuests) {
    doc.text(`Number of Guests: ${booking.numberOfGuests}`);
  }
  doc.moveDown(1);

  // Guest Information
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000').text('Guest Information');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica').fillColor('#333333');
  
  if (booking.user) {
    doc.text(`Name: ${booking.user.firstName} ${booking.user.lastName}`);
    doc.text(`Email: ${booking.user.email}`);
    if (booking.user.phone) {
      doc.text(`Phone: ${booking.user.phone}`);
    }
  } else {
    doc.text(`Name: ${booking.guestName || 'N/A'}`);
    doc.text(`Email: ${booking.guestEmail || 'N/A'}`);
    doc.text(`Phone: ${booking.guestPhone || 'N/A'}`);
  }
  doc.moveDown(1);

  // Property Owner Information
  if (booking.property?.owner) {
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000').text('Property Owner');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('#333333');
    doc.text(`Name: ${booking.property.owner.firstName} ${booking.property.owner.lastName}`);
    doc.text(`Email: ${booking.property.owner.email}`);
    if (booking.property.owner.phone) {
      doc.text(`Phone: ${booking.property.owner.phone}`);
    }
    doc.moveDown(1);
  }

  // Payment Summary
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000').text('Payment Summary');
  doc.moveDown(0.3);
  
  const summaryX = 50;
  const amountX = pageWidth - 50;
  
  doc.fontSize(10).font('Helvetica').fillColor('#333333');
  doc.text('Base Price:', summaryX, doc.y, { continued: true, width: pageWidth - 100 });
  doc.text(formatCurrency(booking.basePrice, booking.currency), amountX, doc.y, { align: 'right' });
  doc.moveDown(0.5);
  
  if (parseFloat(booking.serviceFee) > 0) {
    doc.text('Service Fee:', summaryX, doc.y, { continued: true, width: pageWidth - 100 });
    doc.text(formatCurrency(booking.serviceFee, booking.currency), amountX, doc.y, { align: 'right' });
    doc.moveDown(0.5);
  }
  
  if (parseFloat(booking.taxAmount) > 0) {
    doc.text('Tax:', summaryX, doc.y, { continued: true, width: pageWidth - 100 });
    doc.text(formatCurrency(booking.taxAmount, booking.currency), amountX, doc.y, { align: 'right' });
    doc.moveDown(0.5);
  }
  
  if (parseFloat(booking.discountAmount) > 0) {
    doc.fillColor('#00AA00');
    doc.text('Discount:', summaryX, doc.y, { continued: true, width: pageWidth - 100 });
    doc.text(`-${formatCurrency(booking.discountAmount, booking.currency)}`, amountX, doc.y, { align: 'right' });
    doc.fillColor('#333333');
    doc.moveDown(0.5);
  }
  
  // Line separator
  doc.strokeColor('#CCCCCC').lineWidth(0.5)
    .moveTo(50, doc.y).lineTo(pageWidth + 50, doc.y).stroke();
  doc.moveDown(0.5);
  
  // Total
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000');
  doc.text('TOTAL AMOUNT:', summaryX, doc.y, { continued: true, width: pageWidth - 100 });
  doc.fontSize(14).text(formatCurrency(booking.totalPrice, booking.currency), amountX, doc.y, { align: 'right' });
  doc.moveDown(1);

  // Special Requests
  if (booking.specialRequests) {
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000').text('Special Requests');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('#333333').text(booking.specialRequests);
    doc.moveDown(1);
  }

  // Payment Information
  if (booking.paymentMethod) {
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000').text('Payment Information');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('#333333');
    doc.text(`Payment Method: ${booking.paymentMethod.toUpperCase()}`);
    if (booking.transactionId) {
      doc.text(`Transaction ID: ${booking.transactionId}`);
    }
    doc.moveDown(1);
  }

  // Footer
  doc.moveDown(2);
  doc.strokeColor('#000000').lineWidth(0.5)
    .moveTo(50, doc.y).lineTo(pageWidth + 50, doc.y).stroke();
  doc.moveDown(0.5);
  doc.fontSize(8).font('Helvetica').fillColor('#666666')
    .text('This is a computer-generated receipt. No signature is required.', { align: 'center' });
  doc.text(`Generated on ${new Date().toLocaleString('en-US')}`, { align: 'center' });
  doc.moveDown(0.3);
  doc.text('For any inquiries, please contact support.', { align: 'center' });
}

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount, currency = 'NGN') {
  const formatter = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency,
  });
  return formatter.format(amount);
}
