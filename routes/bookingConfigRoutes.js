import express from 'express';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js';
import BookingConfig from '../schema/BookingConfig.js';

const router = express.Router();

/**
 * Admin Booking Config Routes
 * All routes require admin authentication
 */
router.use(authenticateToken);
router.use(requireRole('admin'));

/**
 * @route   GET /api/admin/booking-config
 * @desc    Get all booking configurations
 * @access  Admin
 */
router.get('/', async (req, res) => {
    try {
        const configs = await BookingConfig.findAll({
            order: [['key', 'ASC']]
        });

        res.json({
            success: true,
            data: configs
        });
    } catch (error) {
        console.error('Error fetching booking configs:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch booking configurations' });
    }
});

/**
 * @route   GET /api/admin/booking-config/:key
 * @desc    Get a specific booking configuration by key
 * @access  Admin
 */
router.get('/:key', async (req, res) => {
    try {
        const config = await BookingConfig.findOne({
            where: { key: req.params.key }
        });

        if (!config) {
            return res.status(404).json({ success: false, message: 'Configuration not found' });
        }

        res.json({ success: true, data: config });
    } catch (error) {
        console.error('Error fetching booking config:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch configuration' });
    }
});

/**
 * @route   PUT /api/admin/booking-config/:key
 * @desc    Update a booking configuration value (creates if not exists)
 * @access  Admin
 * @body    { value: string, description?: string, isActive?: boolean }
 */
router.put('/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const { value, description, isActive } = req.body;

        if (value === undefined || value === null || value === '') {
            return res.status(400).json({ success: false, message: 'Value is required' });
        }

        const [config, created] = await BookingConfig.findOrCreate({
            where: { key },
            defaults: {
                value: String(value),
                description: description || null,
                isActive: isActive !== undefined ? isActive : true,
                updatedBy: req.user.id
            }
        });

        if (!created) {
            await config.update({
                value: String(value),
                ...(description !== undefined && { description }),
                ...(isActive !== undefined && { isActive }),
                updatedBy: req.user.id
            });
        }

        console.log(`⚙️ [BOOKING CONFIG] ${created ? 'Created' : 'Updated'} '${key}' = '${value}' by admin ${req.user.id}`);

        res.json({
            success: true,
            message: `Configuration '${key}' ${created ? 'created' : 'updated'} successfully`,
            data: await config.reload()
        });
    } catch (error) {
        console.error('Error updating booking config:', error);
        res.status(500).json({ success: false, message: 'Failed to update configuration' });
    }
});

/**
 * @route   DELETE /api/admin/booking-config/:key
 * @desc    Delete a booking configuration
 * @access  Admin
 */
router.delete('/:key', async (req, res) => {
    try {
        const config = await BookingConfig.findOne({ where: { key: req.params.key } });

        if (!config) {
            return res.status(404).json({ success: false, message: 'Configuration not found' });
        }

        await config.destroy();
        console.log(`⚙️ [BOOKING CONFIG] Deleted '${req.params.key}' by admin ${req.user.id}`);

        res.json({ success: true, message: `Configuration '${req.params.key}' deleted` });
    } catch (error) {
        console.error('Error deleting booking config:', error);
        res.status(500).json({ success: false, message: 'Failed to delete configuration' });
    }
});

export default router;
