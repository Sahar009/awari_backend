import { Op, fn, col, literal } from 'sequelize';
import crypto from 'crypto';
import { User, Property, Booking, Payment, Subscription, Review, KycDocument, SubscriptionPlan, Notification } from '../schema/index.js';
import { sendEmail } from '../modules/notifications/email.js';
import propertyService from './propertyService.js';
import subscriptionService from './subscriptionService.js';
import subscriptionPlanService from './subscriptionPlanService.js';
import { hashPassword } from '../utils/index.js';

const buildPaginationMeta = (count, page, limit) => {
  const currentPage = Number(page) || 1;
  const perPage = Number(limit) || 10;
  const totalPages = Math.ceil(count / perPage) || 1;

  return {
    currentPage,
    totalPages,
    totalItems: count,
    itemsPerPage: perPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1
  };
};

export const getOverviewStats = async (options = {}) => {
  try {
    const { startDate, endDate } = options;

    const dateRange = {};
    if (startDate) dateRange[Op.gte] = startDate;
    if (endDate) dateRange[Op.lte] = endDate;

    const [
      totalUsers,
      totalProperties,
      totalBookings,
      totalRevenue,
      usersByRoleRaw,
      propertiesByStatusRaw,
      bookingsByStatusRaw,
      activeSubscriptions
    ] = await Promise.all([
      User.count(),
      Property.count(),
      Booking.count(),
      Payment.sum('amount', { where: { status: 'completed', createdAt: dateRange } }),
      User.findAll({
        attributes: ['role', [fn('COUNT', col('id')), 'count']],
        group: ['role']
      }),
      Property.findAll({
        attributes: ['status', [fn('COUNT', col('id')), 'count']],
        group: ['status']
      }),
      Booking.findAll({
        attributes: ['status', [fn('COUNT', col('id')), 'count']],
        group: ['status']
      }),
      Subscription.count({ where: { status: 'active' } })
    ]);

    const usersByRole = usersByRoleRaw.reduce((acc, row) => {
      acc[row.role] = Number(row.get('count'));
      return acc;
    }, {});

    const propertiesByStatus = propertiesByStatusRaw.reduce((acc, row) => {
      acc[row.status] = Number(row.get('count'));
      return acc;
    }, {});

    const bookingsByStatus = bookingsByStatusRaw.reduce((acc, row) => {
      acc[row.status] = Number(row.get('count'));
      return acc;
    }, {});

    const recentUsers = await User.findAll({
      where: dateRange && Object.keys(dateRange).length ? { createdAt: dateRange } : {},
      order: [['createdAt', 'DESC']],
      limit: 5,
      attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'status', 'createdAt']
    });

    const recentProperties = await Property.findAll({
      where: dateRange && Object.keys(dateRange).length ? { createdAt: dateRange } : {},
      order: [['createdAt', 'DESC']],
      limit: 5,
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    return {
      success: true,
      message: 'Admin dashboard overview retrieved successfully',
      data: {
        totals: {
          totalUsers,
          totalProperties,
          totalBookings,
          totalRevenue: Number(totalRevenue || 0),
          activeSubscriptions
        },
        usersByRole,
        propertiesByStatus,
        bookingsByStatus,
        recentUsers: recentUsers.map((user) => user.get({ plain: true })),
        recentProperties: recentProperties.map((property) => property.get({ plain: true }))
      },
      statusCode: 200
    };
  } catch (error) {
    console.error('Admin overview stats error:', error);
    return {
      success: false,
      message: 'Failed to retrieve overview statistics',
      error: error.message,
      statusCode: 500
    };
  }
};

export const getUsers = async (options = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      role,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = options;

    const whereClause = {};

    if (role) whereClause.role = role;
    if (status) whereClause.status = status;
    if (search) {
      whereClause[Op.or] = [
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const allowedSortFields = ['createdAt', 'lastLogin', 'firstName', 'role', 'status'];
    const normalizedSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const normalizedSortOrder = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows } = await User.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['passwordHash'] },
      order: [[normalizedSortBy, normalizedSortOrder]],
      limit: Number(limit),
      offset,
      distinct: true
    });

    return {
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users: rows.map((user) => user.get({ plain: true })),
        pagination: buildPaginationMeta(count, page, limit)
      },
      statusCode: 200
    };
  } catch (error) {
    console.error('Admin get users error:', error);
    return {
      success: false,
      message: 'Failed to retrieve users',
      error: error.message,
      statusCode: 500
    };
  }
};

export const createAdminUser = async (creatorId, payload = {}) => {
  try {
    const { firstName, lastName, email, phone } = payload;

    if (!firstName || !lastName || !email) {
      return {
        success: false,
        message: 'firstName, lastName and email are required',
        statusCode: 400
      };
    }

    const existingUser = await User.findOne({
      where: { email },
      paranoid: false
    });

    if (existingUser) {
      return {
        success: false,
        message: 'A user with this email already exists',
        statusCode: 409
      };
    }

    const temporaryPassword =
      payload?.temporaryPassword ??
      crypto.randomBytes(9).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);

    const passwordHash = await hashPassword(temporaryPassword);

    const newUser = await User.create({
      firstName,
      lastName,
      email,
      phone: phone?.trim() || null,
      role: 'admin',
      status: 'active',
      emailVerified: true,
      profileCompleted: false,
      passwordHash
    });

    const plainUser = newUser.get({ plain: true });
    delete plainUser.passwordHash;
    delete plainUser.passwordResetToken;
    delete plainUser.passwordResetExpires;

    const adminPortalUrl = process.env.ADMIN_APP_URL || 'https://admin.awari.com';
    const subject = 'Your AWARI admin access';
    const emailText = [
      `Hi ${firstName},`,
      '',
      'An administrator account has been created for you on the AWARI control center.',
      '',
      `Sign in at: ${adminPortalUrl}`,
      `Email: ${email}`,
      `Temporary password: ${temporaryPassword}`,
      '',
      'For security, please change your password after your first login.',
      '',
      '— AWARI Team'
    ].join('\n');

    let emailSent = false;
    try {
      emailSent = await sendEmail(email, subject, emailText);
    } catch (emailError) {
      console.error('Failed to send admin invite email:', emailError);
    }

    return {
      success: true,
      message: emailSent
        ? 'Admin account created and credentials emailed successfully'
        : 'Admin account created, but email delivery failed',
      data: {
        user: plainUser,
        temporaryPassword,
        emailSent
      },
      statusCode: 201
    };
  } catch (error) {
    console.error('Admin create admin user error:', error);
    return {
      success: false,
      message: 'Failed to create admin user',
      error: error.message,
      statusCode: 500
    };
  }
};

export const updateUserStatus = async (adminId, userId, payload = {}) => {
  try {
    if (adminId === userId) {
      return {
        success: false,
        message: 'You cannot modify your own status',
        statusCode: 400
      };
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return {
        success: false,
        message: 'User not found',
        statusCode: 404
      };
    }

    if (user.role === 'admin') {
      return {
        success: false,
        message: 'Cannot modify another admin account',
        statusCode: 403
      };
    }

    const { action, reason } = payload;
    const allowedActions = ['activate', 'suspend', 'ban', 'reinstate', 'approve'];
    if (!allowedActions.includes(action)) {
      return {
        success: false,
        message: 'Invalid action provided',
        statusCode: 400
      };
    }

    const statusMap = {
      activate: 'active',
      approve: 'active',
      suspend: 'suspended',
      ban: 'banned',
      reinstate: 'active'
    };

    const updates = {
      status: statusMap[action]
    };

    if (action === 'approve' || action === 'activate' || action === 'reinstate') {
      updates.emailVerified = true;
      updates.deletedAt = null;
    }

    await user.update(updates);
    const updatedUser = await User.findByPk(userId, { attributes: { exclude: ['passwordHash'] } });

    return {
      success: true,
      message: `User ${action}d successfully`,
      data: { user: updatedUser.get({ plain: true }), reason },
      statusCode: 200
    };
  } catch (error) {
    console.error('Admin update user status error:', error);
    return {
      success: false,
      message: 'Failed to update user status',
      error: error.message,
      statusCode: 500
    };
  }
};

export const updateUserRole = async (adminId, userId, role) => {
  try {
    if (adminId === userId) {
      return {
        success: false,
        message: 'You cannot modify your own role',
        statusCode: 400
      };
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return {
        success: false,
        message: 'User not found',
        statusCode: 404
      };
    }

    if (user.role === 'admin' && role !== 'admin') {
      return {
        success: false,
        message: 'Cannot downgrade another administrator',
        statusCode: 403
      };
    }

    await user.update({ role });
    const updatedUser = await User.findByPk(userId, { attributes: { exclude: ['passwordHash'] } });

    return {
      success: true,
      message: 'User role updated successfully',
      data: updatedUser.get({ plain: true }),
      statusCode: 200
    };
  } catch (error) {
    console.error('Admin update user role error:', error);
    return {
      success: false,
      message: 'Failed to update user role',
      error: error.message,
      statusCode: 500
    };
  }
};

export const getUserDetails = async (userId) => {
  try {
    const baseAttributes = [
      'id',
      'email',
      'firstName',
      'lastName',
      'phone',
      'avatarUrl',
      'role',
      'status',
      'emailVerified',
      'phoneVerified',
      'kycVerified',
      'profileCompleted',
      'dateOfBirth',
      'gender',
      'address',
      'city',
      'state',
      'language',
      'bio',
      'socialLinks',
      'preferences',
      'googleId',
      'lastLogin',
      'loginCount',
      'createdAt',
      'updatedAt'
    ];

    const user = await User.findByPk(userId, {
      attributes: baseAttributes,
      include: [
        {
          model: Property,
          as: 'ownedProperties',
          separate: true,
          limit: 10,
          order: [['createdAt', 'DESC']],
          attributes: ['id', 'title', 'listingType', 'status', 'city', 'state', 'createdAt']
        },
        {
          model: Booking,
          as: 'userBookings',
          separate: true,
          limit: 10,
          order: [['createdAt', 'DESC']],
          attributes: [
            'id',
            'bookingType',
            'status',
            'checkInDate',
            'checkOutDate',
            'numberOfNights',
            'numberOfGuests',
            'totalPrice',
            'currency',
            'paymentStatus',
            'createdAt'
          ],
          include: [
            {
              model: Property,
              as: 'property',
              attributes: ['id', 'title', 'listingType', 'city', 'state']
            }
          ]
        },
        {
          model: Subscription,
          as: 'subscriptions',
          separate: true,
          limit: 10,
          order: [['createdAt', 'DESC']],
          attributes: ['id', 'planType', 'status', 'startDate', 'endDate', 'createdAt']
        },
        {
          model: KycDocument,
          as: 'kycDocuments',
          separate: true,
          limit: 10,
          order: [['createdAt', 'DESC']],
          attributes: ['id', 'documentType', 'status', 'verifiedAt', 'createdAt']
        },
        {
          model: Review,
          as: 'reviews',
          separate: true,
          limit: 10,
          order: [['createdAt', 'DESC']],
          attributes: ['id', 'reviewType', 'rating', 'status', 'createdAt'],
          include: [
            {
              model: Property,
              as: 'property',
              attributes: ['id', 'title', 'listingType']
            }
          ]
        }
      ]
    });

    if (!user) {
      return {
        success: false,
        message: 'User not found',
        statusCode: 404
      };
    }

    const [totalOwnedProperties, totalBookings, activeBookings, totalReviews, activeSubscriptions] = await Promise.all([
      Property.count({ where: { ownerId: userId } }),
      Booking.count({ where: { userId } }),
      Booking.count({ where: { userId, status: { [Op.in]: ['confirmed', 'completed'] } } }),
      Review.count({ where: { reviewerId: userId } }),
      Subscription.count({ where: { userId, status: 'active' } })
    ]);

    return {
      success: true,
      message: 'User details retrieved successfully',
      data: {
        user: user.get({ plain: true }),
        summary: {
          totalOwnedProperties,
          totalBookings,
          activeBookings,
          totalReviews,
          activeSubscriptions
        }
      },
      statusCode: 200
    };
  } catch (error) {
    console.error('Admin get user details error:', error);
    return {
      success: false,
      message: 'Failed to retrieve user details',
      error: error.message,
      statusCode: 500
    };
  }
};

export const updateUserProfile = async (adminId, userId, payload = {}) => {
  try {
    const allowedFields = [
      'firstName',
      'lastName',
      'email',
      'phone',
      'avatarUrl',
      'address',
      'city',
      'state',
      'language',
      'bio',
      'socialLinks',
      'preferences',
      'dateOfBirth',
      'gender',
      'emailVerified',
      'phoneVerified',
      'kycVerified',
      'profileCompleted'
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(payload, field)) {
        updates[field] = payload[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return {
        success: false,
        message: 'No valid fields provided for update',
        statusCode: 400
      };
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return {
        success: false,
        message: 'User not found',
        statusCode: 404
      };
    }

    if (updates.email && updates.email !== user.email) {
      const existingUser = await User.findOne({
        where: {
          email: updates.email,
          id: { [Op.ne]: userId }
        }
      });
      if (existingUser) {
        return {
          success: false,
          message: 'Another account already uses this email address',
          statusCode: 409
        };
      }
    }

    if (typeof updates.socialLinks === 'string') {
      try {
        updates.socialLinks = JSON.parse(updates.socialLinks);
      } catch (error) {
        return {
          success: false,
          message: 'socialLinks must be a valid JSON string',
          statusCode: 400
        };
      }
    }

    if (typeof updates.preferences === 'string') {
      try {
        updates.preferences = JSON.parse(updates.preferences);
      } catch (error) {
        return {
          success: false,
          message: 'preferences must be a valid JSON string',
          statusCode: 400
        };
      }
    }

    await user.update(updates);

    const updatedUser = await User.findByPk(userId, {
      attributes: {
        exclude: ['passwordHash', 'passwordResetToken', 'accountDeletionToken']
      }
    });

    return {
      success: true,
      message: 'User profile updated successfully',
      data: updatedUser.get({ plain: true }),
      statusCode: 200
    };
  } catch (error) {
    console.error('Admin update user profile error:', error);
    return {
      success: false,
      message: 'Failed to update user profile',
      error: error.message,
      statusCode: 500
    };
  }
};

export const getModerationOverview = async () => {
  try {
    const [
      pendingProperties,
      pendingReviews,
      flaggedReviews,
      pendingKyc,
      reportedListings,
      paymentDisputes
    ] = await Promise.all([
      Property.count({ where: { status: 'pending' } }),
      Review.count({ where: { status: 'pending' } }),
      Review.count({ where: { reportCount: { [Op.gt]: 0 } } }),
      KycDocument.count({ where: { status: 'pending' } }),
      Property.count({
        where: {
          [Op.or]: [
            { status: 'rejected' },
            { status: 'archived' },
            { rejectionReason: { [Op.ne]: null } },
            { moderationNotes: { [Op.ne]: null } }
          ]
        }
      }),
      Payment.count({
        where: {
          status: {
            [Op.in]: ['failed', 'refunded']
          }
        }
      })
    ]);

    return {
      success: true,
      message: 'Moderation overview retrieved successfully',
      data: {
        pendingProperties,
        pendingReviews,
        flaggedReviews,
        pendingKyc,
        reportedListings,
        paymentDisputes
      },
      statusCode: 200
    };
  } catch (error) {
    console.error('Admin moderation overview error:', error);
    return {
      success: false,
      message: 'Failed to retrieve moderation overview',
      error: error.message,
      statusCode: 500
    };
  }
};

export const getModerationReviews = async (options = {}) => {
  try {
    const { page = 1, limit = 10, filter = 'pending', search } = options;
    const offset = (Number(page) - 1) * Number(limit);

    const whereClause = {};

    if (filter === 'pending') {
      whereClause.status = 'pending';
    } else if (filter === 'flagged') {
      whereClause.reportCount = { [Op.gt]: 0 };
    }

    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Review.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl', 'role']
        },
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'title', 'listingType', 'city', 'state']
        },
        {
          model: Booking,
          as: 'booking',
          attributes: ['id', 'bookingType', 'checkInDate', 'checkOutDate', 'numberOfNights', 'numberOfGuests'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: Number(limit),
      offset,
      distinct: true
    });

    return {
      success: true,
      message: 'Moderation reviews retrieved successfully',
      data: {
        reviews: rows.map((review) => review.get({ plain: true })),
        pagination: buildPaginationMeta(count, page, limit)
      },
      statusCode: 200
    };
  } catch (error) {
    console.error('Admin moderation reviews error:', error);
    return {
      success: false,
      message: 'Failed to retrieve reviews awaiting moderation',
      error: error.message,
      statusCode: 500
    };
  }
};

export const getModerationListings = async (options = {}) => {
  try {
    const { page = 1, limit = 10, status, listingType, search } = options;
    const offset = (Number(page) - 1) * Number(limit);

    const whereClause = {};

    if (status === 'pending') {
      whereClause.status = 'pending';
    } else if (status === 'rejected') {
      whereClause.status = 'rejected';
    } else if (status === 'archived') {
      whereClause.status = 'archived';
    } else if (status === 'flagged') {
      whereClause[Op.or] = [
        { rejectionReason: { [Op.ne]: null } },
        { moderationNotes: { [Op.ne]: null } }
      ];
    } else {
      whereClause[Op.or] = [
        { status: 'pending' },
        { status: 'rejected' },
        { status: 'archived' },
        { rejectionReason: { [Op.ne]: null } },
        { moderationNotes: { [Op.ne]: null } }
      ];
    }

    if (listingType) {
      whereClause.listingType = listingType;
    }

    if (search) {
      whereClause[Op.or] = [
        ...(whereClause[Op.or] || []),
        { title: { [Op.like]: `%${search}%` } },
        { city: { [Op.like]: `%${search}%` } },
        { state: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Property.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        },
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        }
      ],
      order: [['updatedAt', 'DESC']],
      limit: Number(limit),
      offset,
      distinct: true
    });

    return {
      success: true,
      message: 'Moderation listings retrieved successfully',
      data: {
        listings: rows.map((property) => property.get({ plain: true })),
        pagination: buildPaginationMeta(count, page, limit)
      },
      statusCode: 200
    };
  } catch (error) {
    console.error('Admin moderation listings error:', error);
    return {
      success: false,
      message: 'Failed to retrieve listings awaiting moderation',
      error: error.message,
      statusCode: 500
    };
  }
};

export const getModerationKycDocuments = async (options = {}) => {
  try {
    const { page = 1, limit = 10, status = 'pending', documentType } = options;
    const offset = (Number(page) - 1) * Number(limit);

    const whereClause = {};
    if (status) {
      whereClause.status = status;
    }
    if (documentType) {
      whereClause.documentType = documentType;
    }

    const { count, rows } = await KycDocument.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        },
        {
          model: User,
          as: 'verifier',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: Number(limit),
      offset,
      distinct: true
    });

    return {
      success: true,
      message: 'KYC documents retrieved successfully',
      data: {
        documents: rows.map((doc) => doc.get({ plain: true })),
        pagination: buildPaginationMeta(count, page, limit)
      },
      statusCode: 200
    };
  } catch (error) {
    console.error('Admin moderation KYC error:', error);
    return {
      success: false,
      message: 'Failed to retrieve KYC documents',
      error: error.message,
      statusCode: 500
    };
  }
};

export const getModerationPayments = async (options = {}) => {
  try {
    const { page = 1, limit = 10, status = 'failed', search } = options;
    const offset = (Number(page) - 1) * Number(limit);

    let statusFilter = [];
    if (Array.isArray(status)) {
      statusFilter = status;
    } else if (typeof status === 'string') {
      statusFilter = status.split(',').map((value) => value.trim()).filter(Boolean);
    }
    if (statusFilter.length === 0) {
      statusFilter = ['failed'];
    }

    const whereClause = {
      status: {
        [Op.in]: statusFilter
      }
    };

    if (search) {
      whereClause[Op.or] = [
        { transactionId: { [Op.like]: `%${search}%` } },
        { reference: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Payment.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'title', 'listingType']
        },
        {
          model: Booking,
          as: 'booking',
          attributes: ['id', 'bookingType', 'status'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: Number(limit),
      offset,
      distinct: true
    });

    return {
      success: true,
      message: 'Payments requiring attention retrieved successfully',
      data: {
        payments: rows.map((payment) => payment.get({ plain: true })),
        pagination: buildPaginationMeta(count, page, limit)
      },
      statusCode: 200
    };
  } catch (error) {
    console.error('Admin moderation payments error:', error);
    return {
      success: false,
      message: 'Failed to retrieve payments requiring attention',
      error: error.message,
      statusCode: 500
    };
  }
};

export const updateKycDocument = async (adminId, documentId, payload = {}) => {
  try {
    const { status, verificationNotes, rejectionReason } = payload;

    const allowedStatuses = ['pending', 'approved', 'rejected', 'expired'];
    if (status && !allowedStatuses.includes(status)) {
      return {
        success: false,
        message: 'Invalid status provided',
        statusCode: 400
      };
    }

    const document = await KycDocument.findByPk(documentId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        },
        {
          model: User,
          as: 'verifier',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        }
      ]
    });

    if (!document) {
      return {
        success: false,
        message: 'KYC document not found',
        statusCode: 404
      };
    }

    const updates = {};
    if (status) {
      updates.status = status;
    }
    if (verificationNotes !== undefined) {
      updates.verificationNotes = verificationNotes;
    }
    if (rejectionReason !== undefined) {
      updates.rejectionReason = rejectionReason || null;
    }

    if (status === 'approved') {
      updates.verifiedBy = adminId;
      updates.verifiedAt = new Date();
      updates.rejectionReason = null;
    } else if (status === 'rejected') {
      updates.verifiedBy = adminId;
      updates.verifiedAt = new Date();
      if (!updates.rejectionReason && !document.rejectionReason) {
        updates.rejectionReason = 'No reason provided';
      }
    } else if (status === 'pending') {
      updates.verifiedBy = null;
      updates.verifiedAt = null;
      updates.rejectionReason = null;
    }

    await document.update(updates);

    const updatedDocument = await KycDocument.findByPk(documentId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        },
        {
          model: User,
          as: 'verifier',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        }
      ]
    });

    const plainDocument = updatedDocument.get({ plain: true });

    if (plainDocument.user?.email) {
      const subject = 'AWARI KYC Verification Update';
      const statusLabel = status ?? plainDocument.status;
      const greeting = `Hello ${plainDocument.user.firstName},`;
      const bodyLines = [
        greeting,
        '',
        `Your submitted ${plainDocument.documentType.replace('_', ' ')} has been ${statusLabel}.`,
        verificationNotes ? `Moderator notes: ${verificationNotes}` : null,
        statusLabel === 'rejected' && (updates.rejectionReason || plainDocument.rejectionReason)
          ? `Reason: ${updates.rejectionReason || plainDocument.rejectionReason}`
          : null,
        '',
        'If you have any questions, please reply to this email or contact support.',
        '',
        '— The AWARI Trust & Safety team'
      ].filter(Boolean);

      const text = bodyLines.join('\n');
      try {
        await sendEmail(plainDocument.user.email, subject, text, null, null);
      } catch (emailError) {
        console.error('Failed to send KYC update email:', emailError);
      }
    }

    return {
      success: true,
      message: 'KYC document updated successfully',
      data: plainDocument,
      statusCode: 200
    };
  } catch (error) {
    console.error('Admin update KYC document error:', error);
    return {
      success: false,
      message: 'Failed to update KYC document',
      error: error.message,
      statusCode: 500
    };
  }
};

export const getTransactions = async (options = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      paymentType,
      paymentMethod,
      gateway,
      startDate,
      endDate,
      search
    } = options;

    const offset = (Number(page) - 1) * Number(limit);

    const whereClause = {};

    if (status) whereClause.status = status;
    if (paymentType) whereClause.paymentType = paymentType;
    if (paymentMethod) whereClause.paymentMethod = paymentMethod;
    if (gateway) whereClause.gateway = gateway;
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate);
      if (endDate) whereClause.createdAt[Op.lte] = new Date(endDate);
    }

    if (search) {
      const searchConditions = [
        { transactionId: { [Op.like]: `%${search}%` } },
        { reference: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
      if (whereClause[Op.or]) {
        whereClause[Op.or] = [...whereClause[Op.or], ...searchConditions];
      } else {
        whereClause[Op.or] = searchConditions;
      }
    }

    const { count, rows } = await Payment.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'title', 'listingType']
        },
        {
          model: Booking,
          as: 'booking',
          attributes: ['id', 'bookingType', 'status'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: Number(limit),
      offset,
      distinct: true
    });

    const [totalAmount, completedAmount, statusBreakdownRaw, typeBreakdownRaw] = await Promise.all([
      Payment.sum('amount', { where: whereClause }),
      Payment.sum('amount', {
        where: {
          ...whereClause,
          status: 'completed'
        }
      }),
      Payment.findAll({
        where: whereClause,
        attributes: ['status', [fn('COUNT', col('id')), 'count']],
        group: ['status'],
        raw: true
      }),
      Payment.findAll({
        where: whereClause,
        attributes: ['paymentType', [fn('COUNT', col('id')), 'count']],
        group: ['paymentType'],
        raw: true
      })
    ]);

    const statusBreakdown = statusBreakdownRaw.reduce((acc, entry) => {
      acc[entry.status] = Number(entry.count ?? 0);
      return acc;
    }, {});

    const typeBreakdown = typeBreakdownRaw.reduce((acc, entry) => {
      acc[entry.paymentType] = Number(entry.count ?? 0);
      return acc;
    }, {});

    return {
      success: true,
      message: 'Transactions retrieved successfully',
      data: {
        transactions: rows.map((payment) => payment.get({ plain: true })),
        pagination: buildPaginationMeta(count, page, limit),
        summary: {
          totalAmount: Number(totalAmount ?? 0),
          completedAmount: Number(completedAmount ?? 0),
          totalCount: count,
          statusBreakdown,
          typeBreakdown,
          filters: {
            status: status ?? null,
            paymentType: paymentType ?? null,
            paymentMethod: paymentMethod ?? null,
            gateway: gateway ?? null,
            startDate: startDate ?? null,
            endDate: endDate ?? null
          }
        }
      },
      statusCode: 200
    };
  } catch (error) {
    console.error('Admin get transactions error:', error);
    return {
      success: false,
      message: 'Failed to retrieve transactions',
      error: error.message,
      statusCode: 500
    };
  }
};

export const getProperties = async (options = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      listingType,
      propertyType,
      city,
      state,
      featured,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = options;

    const allowedSortFields = ['createdAt', 'updatedAt', 'price', 'viewCount', 'title', 'status'];
    const normalizedSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const normalizedSortOrder = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const filters = {
      page: Number(page),
      limit: Number(limit),
      sortBy: normalizedSortBy,
      sortOrder: normalizedSortOrder
    };

    if (status) filters.status = status;
    if (listingType) filters.listingType = listingType;
    if (propertyType) filters.propertyType = propertyType;
    if (city) filters.city = city;
    if (state) filters.state = state;
    if (typeof featured === 'boolean') filters.featured = featured;
    if (search) filters.search = search;

    const [propertiesResult, statsResult, featuredCount] = await Promise.all([
      propertyService.getAllProperties(filters),
      propertyService.getPropertyStatistics(),
      Property.count({ where: { featured: true } })
    ]);

    if (!propertiesResult?.success) {
      throw new Error(propertiesResult?.message || 'Failed to retrieve properties');
    }

    const propertiesRaw = propertiesResult.data?.properties || [];
    const properties = propertiesRaw.map((property) =>
      typeof property?.get === 'function' ? property.get({ plain: true }) : property
    );

    const paginationRaw = propertiesResult.data?.pagination || {};
    const pagination = buildPaginationMeta(
      paginationRaw.total ?? properties.length,
      paginationRaw.page ?? page,
      paginationRaw.limit ?? limit
    );

    const statusStats = statsResult?.data?.statusStats || [];
    const listingStats = statsResult?.data?.listingTypeStats || [];
    const typeStats = statsResult?.data?.propertyTypeStats || [];

    const toNumber = (value) => Number(value ?? 0);

    const statusSummary = statusStats.reduce((acc, item) => {
      const statusKey = item.status ?? item.get?.('status');
      acc[statusKey] = toNumber(item.count ?? item.get?.('count'));
      return acc;
    }, {});

    const listingSummary = listingStats.reduce((acc, item) => {
      const key = item.listingType ?? item.get?.('listingType');
      acc[key] = toNumber(item.count ?? item.get?.('count'));
      return acc;
    }, {});

    const typeSummary = typeStats.reduce((acc, item) => {
      const key = item.propertyType ?? item.get?.('propertyType');
      acc[key] = toNumber(item.count ?? item.get?.('count'));
      return acc;
    }, {});

    const totalProperties = Object.values(statusSummary).reduce((sum, value) => sum + value, 0);

    return {
      success: true,
      message: 'Properties retrieved successfully',
      data: {
        properties,
        pagination,
        summary: {
          totals: {
            totalProperties,
            pendingApproval: statusSummary.pending || 0,
            featuredProperties: toNumber(featuredCount)
          },
          byStatus: statusSummary,
          byListingType: listingSummary,
          byPropertyType: typeSummary
        }
      },
      statusCode: 200
    };
  } catch (error) {
    console.error('Admin get properties error:', error);
    return {
      success: false,
      message: 'Failed to retrieve properties',
      error: error.message,
      statusCode: 500
    };
  }
};

export const getPropertyDetails = async (propertyId) => {
  try {
    const result = await propertyService.getPropertyById(propertyId, false, {
      includeBookings: true,
      includeReviews: true,
      bookingsLimit: 20,
      reviewsLimit: 20
    });
    const property = result?.data
      ? typeof result.data.get === 'function'
        ? result.data.get({ plain: true })
        : result.data
      : null;

    return {
      success: true,
      message: 'Property retrieved successfully',
      data: property,
      statusCode: 200
    };
  } catch (error) {
    console.error('Admin get property details error:', error);
    return {
      success: false,
      message: 'Failed to retrieve property details',
      error: error.message,
      statusCode: error.message === 'Property not found' ? 404 : 500
    };
  }
};

export const updatePropertyStatus = async (adminId, propertyId, payload = {}) => {
  try {
    const { status, rejectionReason, moderationNotes } = payload;
    const allowedStatuses = ['pending', 'active', 'inactive', 'rejected', 'archived', 'sold', 'rented'];

    if (!allowedStatuses.includes(status)) {
      return {
        success: false,
        message: 'Invalid status provided',
        statusCode: 400
      };
    }

    const property = await Property.findByPk(propertyId, {
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        },
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        }
      ]
    });

    if (!property) {
      return {
        success: false,
        message: 'Property not found',
        statusCode: 404
      };
    }

    if (property.status === 'pending' && ['active', 'rejected'].includes(status)) {
      try {
        const moderationResult = await propertyService.moderateProperty(propertyId, adminId, {
          status,
          rejectionReason,
          moderationNotes
        });
        const moderatedProperty = moderationResult?.data
          ? typeof moderationResult.data.get === 'function'
            ? moderationResult.data.get({ plain: true })
            : moderationResult.data
          : null;

        return {
          success: true,
          message: moderationResult?.message || `Property ${status} successfully`,
          data: moderatedProperty,
          statusCode: 200
        };
      } catch (moderationError) {
        return {
          success: false,
          message: moderationError.message || 'Failed to moderate property',
          statusCode: 400
        };
      }
    }

    if (status === 'sold' && property.listingType !== 'sale') {
      return {
        success: false,
        message: 'Only properties listed for sale can be marked as sold',
        statusCode: 400
      };
    }

    if (status === 'rented' && !['rent', 'shortlet'].includes(property.listingType)) {
      return {
        success: false,
        message: 'Only rental or shortlet properties can be marked as rented',
        statusCode: 400
      };
    }

    const updateData = {
      status,
      moderationNotes: moderationNotes ?? null
    };

    if (status === 'active') {
      updateData.approvedBy = adminId;
      updateData.approvedAt = new Date();
      updateData.rejectionReason = null;
    } else if (status === 'rejected') {
      updateData.rejectionReason = rejectionReason || 'No reason provided';
      updateData.approvedAt = null;
    } else if (['inactive', 'archived'].includes(status)) {
      updateData.rejectionReason = rejectionReason ?? null;
      if (status === 'archived') {
        updateData.approvedAt = null;
      }
    } else if (status === 'pending') {
      updateData.approvedAt = null;
      updateData.rejectionReason = null;
      updateData.moderationNotes = moderationNotes ?? 'Returned to pending for review';
    } else {
      updateData.rejectionReason = null;
    }

    await property.update(updateData);

    const updatedProperty = await Property.findByPk(propertyId, {
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        },
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        }
      ]
    });

    return {
      success: true,
      message: `Property status updated to ${status}`,
      data: updatedProperty?.get ? updatedProperty.get({ plain: true }) : updatedProperty,
      statusCode: 200
    };
  } catch (error) {
    console.error('Admin update property status error:', error);
    return {
      success: false,
      message: 'Failed to update property status',
      error: error.message,
      statusCode: 500
    };
  }
};

export const updatePropertyFeature = async (adminId, propertyId, payload = {}) => {
  try {
    const { featured, featuredUntil } = payload;

    const property = await Property.findByPk(propertyId, {
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        },
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        }
      ]
    });

    if (!property) {
      return {
        success: false,
        message: 'Property not found',
        statusCode: 404
      };
    }

    let featuredUntilDate = null;
    if (featured && featuredUntil) {
      featuredUntilDate = new Date(featuredUntil);
      if (Number.isNaN(featuredUntilDate.getTime())) {
        return {
          success: false,
          message: 'featuredUntil must be a valid date',
          statusCode: 400
        };
      }
    }

    const updateData = {
      featured: Boolean(featured),
      featuredUntil: featured ? featuredUntilDate : null
    };

    await property.update(updateData);

    const updatedProperty = await Property.findByPk(propertyId, {
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        },
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        }
      ]
    });

    return {
      success: true,
      message: featured ? 'Property featured successfully' : 'Property removed from featured list',
      data: updatedProperty?.get ? updatedProperty.get({ plain: true }) : updatedProperty,
      statusCode: 200
    };
  } catch (error) {
    console.error('Admin update property feature error:', error);
    return {
      success: false,
      message: 'Failed to update property featured status',
      error: error.message,
      statusCode: 500
    };
  }
};

export const getPendingProperties = async (options = {}) => {
  try {
    const { page = 1, limit = 10 } = options;
    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows } = await Property.findAndCountAll({
      where: { status: 'pending' },
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        },
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: Number(limit),
      offset,
      distinct: true
    });

    return {
      success: true,
      message: 'Pending properties retrieved successfully',
      data: {
        properties: rows.map((property) => property.get({ plain: true })),
        pagination: buildPaginationMeta(count, page, limit)
      },
      statusCode: 200
    };
  } catch (error) {
    console.error('Admin pending properties error:', error);
    return {
      success: false,
      message: 'Failed to retrieve pending properties',
      error: error.message,
      statusCode: 500
    };
  }
};

export const moderateProperty = async (adminId, propertyId, payload = {}) => {
  try {
    const { status, rejectionReason, moderationNotes } = payload;

    if (!['active', 'rejected'].includes(status)) {
      return {
        success: false,
        message: 'Status must be either active or rejected',
        statusCode: 400
      };
    }

    const result = await propertyService.moderateProperty(propertyId, adminId, {
      status,
      rejectionReason,
      moderationNotes
    });

    return result;
  } catch (error) {
    console.error('Admin moderate property error:', error);
    return {
      success: false,
      message: error.message || 'Failed to moderate property',
      statusCode: 500
    };
  }
};

export const getSubscriptions = async (options = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      planType,
      billingCycle,
      autoRenew,
      search
    } = options;

    const whereClause = {};
    if (status) whereClause.status = status;
    if (planType) whereClause.planType = planType;
    if (billingCycle) whereClause.billingCycle = billingCycle;
    if (typeof autoRenew === 'boolean') whereClause.autoRenew = autoRenew;
    if (search) {
      whereClause[Op.or] = [
        { planName: { [Op.like]: `%${search}%` } },
        { planType: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows } = await Subscription.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: Number(limit),
      offset,
      distinct: true
    });

    const planBreakdownRaw = await Subscription.findAll({
      where: whereClause,
      attributes: ['planType', [fn('COUNT', col('id')), 'count']],
      group: ['planType'],
      raw: true
    });

    const statusBreakdownRaw = await Subscription.findAll({
      where: whereClause,
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      group: ['status'],
      raw: true
    });

    const billingBreakdownRaw = await Subscription.findAll({
      where: whereClause,
      attributes: ['billingCycle', [fn('COUNT', col('id')), 'count']],
      group: ['billingCycle'],
      raw: true
    });

    const autoRenewBreakdown = await Subscription.findAll({
      where: whereClause,
      attributes: [
        'autoRenew',
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['autoRenew'],
      raw: true
    });

    const [activeCount, pendingCount, cancelledCount, expiredCount, inactiveCount, totalRevenueRaw] = await Promise.all([
      Subscription.count({ where: { ...whereClause, status: 'active' } }),
      Subscription.count({ where: { ...whereClause, status: 'pending' } }),
      Subscription.count({ where: { ...whereClause, status: 'cancelled' } }),
      Subscription.count({ where: { ...whereClause, status: 'expired' } }),
      Subscription.count({ where: { ...whereClause, status: 'inactive' } }),
      Payment.sum('amount', {
        where: {
          status: 'completed',
          paymentType: 'subscription'
        }
      })
    ]);

    const activeSubscriptions = await Subscription.findAll({
      where: { ...whereClause, status: 'active' },
      attributes: ['monthlyPrice', 'yearlyPrice', 'billingCycle']
    });

    const monthlyRecurringRevenue = activeSubscriptions.reduce((sum, sub) => {
      if (sub.billingCycle === 'monthly') {
        return sum + Number(sub.monthlyPrice || 0);
      }
      if (sub.billingCycle === 'yearly' && sub.yearlyPrice) {
        return sum + Number(sub.yearlyPrice) / 12;
      }
      return sum + Number(sub.monthlyPrice || 0);
    }, 0);

    const planBreakdown = planBreakdownRaw.reduce((acc, entry) => {
      acc[entry.planType] = Number(entry.count ?? 0);
      return acc;
    }, {});

    const statusBreakdown = statusBreakdownRaw.reduce((acc, entry) => {
      acc[entry.status] = Number(entry.count ?? 0);
      return acc;
    }, {});

    const billingBreakdown = billingBreakdownRaw.reduce((acc, entry) => {
      acc[entry.billingCycle] = Number(entry.count ?? 0);
      return acc;
    }, {});

    const autoRenewSummary = autoRenewBreakdown.reduce(
      (acc, entry) => {
        const isEnabled =
          entry.autoRenew === true ||
          entry.autoRenew === 1 ||
          entry.autoRenew === '1' ||
          entry.autoRenew === 'true';
        if (isEnabled) {
          acc.enabled += Number(entry.count ?? 0);
        } else {
          acc.disabled += Number(entry.count ?? 0);
        }
        return acc;
      },
      { enabled: 0, disabled: 0 }
    );

    const subscriptions = rows.map((subscription) => subscription.get({ plain: true }));

    return {
      success: true,
      message: 'Subscriptions retrieved successfully',
      data: {
        subscriptions,
        pagination: buildPaginationMeta(count, page, limit),
        summary: {
          totals: {
            totalSubscriptions: count,
            active: activeCount,
            pending: pendingCount,
            cancelled: cancelledCount,
            expired: expiredCount,
            inactive: inactiveCount
          },
          revenue: {
            totalRevenue: Number(totalRevenueRaw ?? 0),
            monthlyRecurringRevenue: Number(monthlyRecurringRevenue.toFixed(2))
          },
          breakdown: {
            byPlanType: planBreakdown,
            byStatus: statusBreakdown,
            byBillingCycle: billingBreakdown,
            autoRenew: autoRenewSummary
          },
          filters: {
            status: status ?? null,
            planType: planType ?? null,
            billingCycle: billingCycle ?? null,
            autoRenew: typeof autoRenew === 'boolean' ? autoRenew : null
          }
        }
      },
      statusCode: 200
    };
  } catch (error) {
    console.error('Admin subscriptions error:', error);
    return {
      success: false,
      message: 'Failed to retrieve subscriptions',
      error: error.message,
      statusCode: 500
    };
  }
};

export const getSubscriptionDetail = async (subscriptionId) => {
  try {
    const result = await subscriptionService.getSubscriptionById(subscriptionId, null, 'admin');
    const subscription = result?.data?.get
      ? result.data.get({ plain: true })
      : result?.data ?? null;

    return {
      success: true,
      message: 'Subscription retrieved successfully',
      data: subscription,
      statusCode: 200
    };
  } catch (error) {
    console.error('Admin get subscription detail error:', error);
    return {
      success: false,
      message: error.message || 'Failed to retrieve subscription detail',
      error: error.message,
      statusCode: error.message === 'Subscription not found' ? 404 : 500
    };
  }
};

export const createSubscription = async (adminId, payload = {}) => {
  try {
    const { userId, ...subscriptionData } = payload;
    if (!userId) {
      return {
        success: false,
        message: 'userId is required to create a subscription',
        statusCode: 400
      };
    }

    const result = await subscriptionService.createSubscription(subscriptionData, userId);
    const subscription = result?.data?.get
      ? result.data.get({ plain: true })
      : result?.data ?? null;

    return {
      success: true,
      message: result?.message || 'Subscription created successfully',
      data: subscription,
      statusCode: 201
    };
  } catch (error) {
    console.error('Admin create subscription error:', error);
    return {
      success: false,
      message: error.message || 'Failed to create subscription',
      error: error.message,
      statusCode: 400
    };
  }
};

export const updateSubscription = async (adminId, subscriptionId, payload = {}) => {
  try {
    const result = await subscriptionService.updateSubscription(subscriptionId, payload, adminId, 'admin');
    const subscription = result?.data?.get
      ? result.data.get({ plain: true })
      : result?.data ?? null;

    return {
      success: true,
      message: result?.message || 'Subscription updated successfully',
      data: subscription,
      statusCode: 200
    };
  } catch (error) {
    console.error('Admin update subscription error:', error);
    return {
      success: false,
      message: error.message || 'Failed to update subscription',
      error: error.message,
      statusCode: 400
    };
  }
};

export const cancelSubscription = async (adminId, subscriptionId, payload = {}) => {
  try {
    const result = await subscriptionService.cancelSubscription(
      subscriptionId,
      payload?.cancellationReason,
      adminId,
      'admin'
    );
    const subscription = result?.data?.get
      ? result.data.get({ plain: true })
      : result?.data ?? null;

    return {
      success: true,
      message: result?.message || 'Subscription cancelled successfully',
      data: subscription,
      statusCode: 200
    };
  } catch (error) {
    console.error('Admin cancel subscription error:', error);
    return {
      success: false,
      message: error.message || 'Failed to cancel subscription',
      error: error.message,
      statusCode: 400
    };
  }
};

export const renewSubscription = async (adminId, subscriptionId, payload = {}) => {
  try {
    const result = await subscriptionService.renewSubscription(subscriptionId, payload?.billingCycle);
    const subscription = result?.data?.get
      ? result.data.get({ plain: true })
      : result?.data ?? null;

    return {
      success: true,
      message: result?.message || 'Subscription renewed successfully',
      data: subscription,
      statusCode: 200
    };
  } catch (error) {
    console.error('Admin renew subscription error:', error);
    return {
      success: false,
      message: error.message || 'Failed to renew subscription',
      error: error.message,
      statusCode: 400
    };
  }
};

export const getSubscriptionPlans = async (options = {}) => {
  try {
    const result = await subscriptionPlanService.listPlans({
      ...options,
      includeInactive: true,
      includeStats: true
    });
    return result;
  } catch (error) {
    console.error('Admin get subscription plans error:', error);
    return {
      success: false,
      message: 'Failed to retrieve subscription plans',
      error: error.message,
      statusCode: 500
    };
  }
};

export const getSubscriptionPlanDetail = async (planId) => {
  try {
    const plan = await subscriptionPlanService.getPlanByIdentifier({ id: planId }, { includeInactive: true });
    if (!plan) {
      return {
        success: false,
        message: 'Subscription plan not found',
        statusCode: 404
      };
    }

    return {
      success: true,
      message: 'Subscription plan retrieved successfully',
      data: plan,
      statusCode: 200
    };
  } catch (error) {
    console.error('Admin get subscription plan detail error:', error);
    return {
      success: false,
      message: 'Failed to retrieve subscription plan',
      error: error.message,
      statusCode: 500
    };
  }
};

export const createSubscriptionPlan = async (adminId, payload = {}) => {
  try {
    const result = await subscriptionPlanService.createPlan(adminId, payload);
    return result;
  } catch (error) {
    console.error('Admin create subscription plan error:', error);
    return {
      success: false,
      message: error.message || 'Failed to create subscription plan',
      error: error.message,
      statusCode: 400
    };
  }
};

export const updateSubscriptionPlan = async (adminId, planId, payload = {}) => {
  try {
    const result = await subscriptionPlanService.updatePlan(planId, adminId, payload);
    return result;
  } catch (error) {
    console.error('Admin update subscription plan error:', error);
    return {
      success: false,
      message: error.message || 'Failed to update subscription plan',
      error: error.message,
      statusCode: error.message === 'Subscription plan not found' ? 404 : 400
    };
  }
};

export const toggleSubscriptionPlanStatus = async (adminId, planId, payload = {}) => {
  try {
    if (typeof payload?.isActive !== 'boolean') {
      return {
        success: false,
        message: 'isActive must be provided as a boolean value',
        statusCode: 400
      };
    }

    const result = await subscriptionPlanService.togglePlanStatus(planId, adminId, payload.isActive);
    return result;
  } catch (error) {
    console.error('Admin toggle subscription plan status error:', error);
    return {
      success: false,
      message: error.message || 'Failed to update plan status',
      error: error.message,
      statusCode: error.message === 'Subscription plan not found' ? 404 : 400
    };
  }
};

export const getReportsMetrics = async (options = {}) => {
  try {
    const monthsCount = Math.max(1, Math.min(parseInt(options.months, 10) || 6, 12));
    const end = options.endDate ? new Date(options.endDate) : new Date();
    const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - (monthsCount - 1));
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const monthBuckets = [];
    const cursor = new Date(startDate);
    for (let index = 0; index < monthsCount; index += 1) {
      const bucketStart = new Date(cursor);
      const key = bucketStart.toISOString().slice(0, 7);
      const label = bucketStart.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      const bucketEnd = new Date(bucketStart);
      bucketEnd.setMonth(bucketEnd.getMonth() + 1);
      bucketEnd.setMilliseconds(bucketEnd.getMilliseconds() - 1);
      monthBuckets.push({
        key,
        label,
        start: bucketStart,
        end: bucketEnd
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const dateRangeFilter = {
      [Op.between]: [startDate, endDate]
    };

    const [
      usersForGrowth,
      bookingsForTrend,
      paymentsForRevenue,
      bookingStatusRaw,
      propertyStatusRaw,
      propertyListingRaw,
      subscriptionStatusRaw,
      subscriptionPlanRaw,
      activePlansCount,
      totalPlansCount,
      activeSubscriptionsCount,
      flaggedReviewsCount,
      pendingReviewsCount,
      totalUsersCount,
      totalPropertiesCount
    ] = await Promise.all([
      User.findAll({ where: { createdAt: dateRangeFilter }, attributes: ['createdAt'], raw: true }),
      Booking.findAll({
        where: { createdAt: dateRangeFilter },
        attributes: ['createdAt', 'bookingType'],
        raw: true
      }),
      Payment.findAll({
        where: { status: 'completed', createdAt: dateRangeFilter },
        attributes: ['createdAt', 'amount', 'paymentType'],
        raw: true
      }),
      Booking.findAll({
        attributes: ['status', [fn('COUNT', col('id')), 'count']],
        group: ['status'],
        raw: true
      }),
      Property.findAll({
        attributes: ['status', [fn('COUNT', col('id')), 'count']],
        group: ['status'],
        raw: true
      }),
      Property.findAll({
        attributes: ['listingType', [fn('COUNT', col('id')), 'count']],
        group: ['listingType'],
        raw: true
      }),
      Subscription.findAll({
        attributes: ['status', [fn('COUNT', col('id')), 'count']],
        group: ['status'],
        raw: true
      }),
      Subscription.findAll({
        attributes: ['planType', [fn('COUNT', col('id')), 'count']],
        group: ['planType'],
        raw: true
      }),
      SubscriptionPlan.count({ where: { isActive: true } }),
      SubscriptionPlan.count(),
      Subscription.count({ where: { status: 'active' } }),
      Review.count({ where: { reportCount: { [Op.gt]: 0 } } }),
      Review.count({ where: { status: 'pending' } }),
      User.count(),
      Property.count()
    ]);

    const userGrowthAccumulator = usersForGrowth.reduce((acc, item) => {
      const monthKey = new Date(item.createdAt).toISOString().slice(0, 7);
      acc[monthKey] = (acc[monthKey] || 0) + 1;
      return acc;
    }, {});

    const userGrowth = monthBuckets.map(({ key, label }) => ({
      month: key,
      label,
      count: userGrowthAccumulator[key] || 0
    }));

    const revenueTrendAccumulator = paymentsForRevenue.reduce((acc, item) => {
      const amount = Number(item.amount || 0);
      const monthKey = new Date(item.createdAt).toISOString().slice(0, 7);
      acc[monthKey] = (acc[monthKey] || 0) + amount;
      return acc;
    }, {});

    const revenueTrend = monthBuckets.map(({ key, label }) => ({
      month: key,
      label,
      amount: revenueTrendAccumulator[key] || 0
    }));

    const bookingTrendAccumulator = bookingsForTrend.reduce((acc, item) => {
      const monthKey = new Date(item.createdAt).toISOString().slice(0, 7);
      const monthData = acc[monthKey] || {};
      monthData[item.bookingType] = (monthData[item.bookingType] || 0) + 1;
      acc[monthKey] = monthData;
      return acc;
    }, {});

    const bookingTrend = monthBuckets.map(({ key, label }) => {
      const data = bookingTrendAccumulator[key] || {};
      const shortlet = data.shortlet || 0;
      const rental = data.rental || 0;
      const saleInspection = data.sale_inspection || 0;
      return {
        month: key,
        label,
        shortlet,
        rental,
        saleInspection,
        total: shortlet + rental + saleInspection
      };
    });

    const bookingStatus = bookingStatusRaw.reduce((acc, item) => {
      acc[item.status] = Number(item.count);
      return acc;
    }, {});

    const propertyStatus = propertyStatusRaw.reduce((acc, item) => {
      acc[item.status] = Number(item.count);
      return acc;
    }, {});

    const propertyByListingType = propertyListingRaw.reduce((acc, item) => {
      acc[item.listingType] = Number(item.count);
      return acc;
    }, {});

    const subscriptionStatus = subscriptionStatusRaw.reduce((acc, item) => {
      acc[item.status] = Number(item.count);
      return acc;
    }, {});

    const subscriptionPlans = subscriptionPlanRaw.reduce((acc, item) => {
      acc[item.planType] = Number(item.count);
      return acc;
    }, {});

    const revenueByType = paymentsForRevenue.reduce((acc, item) => {
      const typeKey = item.paymentType || 'other';
      const amount = Number(item.amount || 0);
      acc[typeKey] = (acc[typeKey] || 0) + amount;
      return acc;
    }, {});

    const totalRevenue = Object.values(revenueByType).reduce((sum, value) => sum + value, 0);
    const newUsers = userGrowth.reduce((sum, item) => sum + item.count, 0);

    return {
      success: true,
      message: 'Reports metrics retrieved successfully',
      data: {
        timeframe: {
          months: monthsCount,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        charts: {
          userGrowth,
          revenueTrend,
          bookingTrend
        },
        breakdowns: {
          bookingStatus,
          propertyStatus,
          propertyByListingType,
          subscriptionStatus,
          subscriptionPlans,
          revenueByType
        },
        insights: {
          totals: {
            totalUsers: totalUsersCount,
            newUsers,
            totalProperties: totalPropertiesCount,
            activeProperties: propertyStatus.active || 0,
            totalRevenue,
            activePlans: activePlansCount,
            totalPlans: totalPlansCount,
            activeSubscriptions: activeSubscriptionsCount
          },
          reviewModeration: {
            flaggedReviews: flaggedReviewsCount,
            pendingReviews: pendingReviewsCount
          }
        }
      },
      statusCode: 200
    };
  } catch (error) {
    console.error('Admin reports metrics error:', error);
    return {
      success: false,
      message: 'Failed to retrieve reports metrics',
      error: error.message,
      statusCode: 500
    };
  }
};

/**
 * Get login snapshot data for admin login page
 * Returns quick stats: pending listings, active hosts, urgent notifications
 */
export const getLoginSnapshot = async () => {
  try {
    // Calculate 24 hours ago for active hosts
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const [
      pendingListings,
      activeHosts,
      urgentNotifications
    ] = await Promise.all([
      // New listings pending review
      Property.count({
        where: { status: 'pending' }
      }),

      // Active hosts online (landlords/agents who logged in within last 24 hours)
      User.count({
        where: {
          role: { [Op.in]: ['landlord', 'agent', 'hotel_provider'] },
          status: 'active',
          lastLogin: { [Op.gte]: twentyFourHoursAgo }
        }
      }),

      // Urgent support tickets/notifications
      Notification.count({
        where: {
          priority: { [Op.in]: ['urgent', 'high'] },
          status: 'unread',
          isRead: false
        }
      })
    ]);

    return {
      success: true,
      message: 'Login snapshot retrieved successfully',
      data: {
        pendingListings,
        activeHosts,
        urgentNotifications
      },
      statusCode: 200
    };
  } catch (error) {
    console.error('Admin login snapshot error:', error);
    return {
      success: false,
      message: 'Failed to retrieve login snapshot',
      error: error.message,
      statusCode: 500
    };
  }
};


