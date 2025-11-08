import { Op } from 'sequelize';
import { SubscriptionPlan, Subscription } from '../schema/index.js';

const DEFAULT_PLANS = [
  {
    name: 'Basic Plan',
    slug: 'basic',
    planType: 'basic',
    description: 'Kickstart your listings with the essentials needed to stay visible and organised.',
    monthlyPrice: 5000,
    yearlyPrice: 50000,
    currency: 'NGN',
    maxProperties: 5,
    maxPhotosPerProperty: 10,
    featuredProperties: 0,
    prioritySupport: false,
    analyticsAccess: false,
    supportLevel: 'standard',
    features: [
      'List up to 5 properties',
      '10 photos per listing',
      'Standard analytics dashboard',
      'Email support'
    ],
    trialPeriodDays: 0,
    isRecommended: false
  },
  {
    name: 'Premium Plan',
    slug: 'premium',
    planType: 'premium',
    description: 'Scale faster with advanced marketing, analytics, and support tools.',
    monthlyPrice: 15000,
    yearlyPrice: 150000,
    currency: 'NGN',
    maxProperties: 20,
    maxPhotosPerProperty: 25,
    featuredProperties: 3,
    prioritySupport: true,
    analyticsAccess: true,
    supportLevel: 'priority',
    features: [
      'List up to 20 properties',
      '25 photos per listing',
      '3 featured property slots monthly',
      'Advanced analytics & insights',
      'Priority support queue'
    ],
    trialPeriodDays: 7,
    isRecommended: true
  },
  {
    name: 'Enterprise Plan',
    slug: 'enterprise',
    planType: 'enterprise',
    description: 'Unrestricted access with concierge support for large teams and portfolios.',
    monthlyPrice: 50000,
    yearlyPrice: 500000,
    currency: 'NGN',
    maxProperties: -1,
    maxPhotosPerProperty: 50,
    featuredProperties: -1,
    prioritySupport: true,
    analyticsAccess: true,
    supportLevel: 'concierge',
    features: [
      'Unlimited properties & media',
      'Unlimited featured slots',
      'Dedicated success manager',
      'API & integrations access',
      'Advanced analytics suite'
    ],
    trialPeriodDays: 14,
    isRecommended: false
  }
];

const toSlug = (value) =>
  value
    ?.toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || null;

const parseFeatures = (features) => {
  if (!features) return null;
  if (Array.isArray(features)) return features;
  if (typeof features === 'string') {
    return features
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return features;
};

const toPlain = (plan) => (plan?.get ? plan.get({ plain: true }) : plan);

class SubscriptionPlanService {
  constructor() {
    this.defaultsSeeded = false;
  }

  async ensureDefaultPlans() {
    if (this.defaultsSeeded) {
      return;
    }

    for (const defaultPlan of DEFAULT_PLANS) {
      const slug = defaultPlan.slug || toSlug(defaultPlan.name);
      await SubscriptionPlan.findOrCreate({
        where: {
          [Op.or]: [{ slug }, { planType: defaultPlan.planType }]
        },
        defaults: {
          ...defaultPlan,
          slug
        }
      });
    }

    this.defaultsSeeded = true;
  }

  async listPlans(options = {}) {
    await this.ensureDefaultPlans();

    const {
      page = 1,
      limit = 20,
      status,
      planType,
      search,
      includeInactive = false,
      includeStats = false
    } = options;

    const where = {};

    if (!includeInactive) {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    } else if (status === 'active') {
      where.isActive = true;
    }

    if (planType) {
      where.planType = planType;
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { slug: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows } = await SubscriptionPlan.findAndCountAll({
      where,
      order: [['isRecommended', 'DESC'], ['monthlyPrice', 'ASC']],
      limit: Number(limit),
      offset,
      distinct: true
    });

    let stats = null;
    if (includeStats) {
      const totalActiveSubscriptions = await Subscription.count({
        where: {
          status: 'active'
        }
      });

      stats = {
        totalPlans: count,
        totalActiveSubscriptions
      };
    }

    return {
      success: true,
      message: 'Subscription plans retrieved successfully',
      data: {
        plans: rows.map((plan) => toPlain(plan)),
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(count / Number(limit)) || 1,
          totalItems: count,
          itemsPerPage: Number(limit),
          hasNextPage: offset + Number(limit) < count,
          hasPrevPage: offset > 0
        },
        stats
      },
      statusCode: 200
    };
  }

  async getPublicPlans() {
    const result = await this.listPlans({ includeInactive: false, limit: 100 });
    return result?.data?.plans ?? [];
  }

  async getPlanByIdentifier(identifier = {}, options = {}) {
    await this.ensureDefaultPlans();

    const { includeInactive = false } = options;

    const where = {};
    if (identifier.id) where.id = identifier.id;
    if (identifier.slug) where.slug = identifier.slug;
    if (identifier.planType) where.planType = identifier.planType;

    if (!includeInactive) {
      where.isActive = true;
    }

    if (!Object.keys(where).length) {
      return null;
    }

    const plan = await SubscriptionPlan.findOne({ where });
    return plan ? toPlain(plan) : null;
  }

  async createPlan(adminId, payload = {}) {
    await this.ensureDefaultPlans();

    const {
      name,
      slug: providedSlug,
      planType = 'custom',
      description,
      monthlyPrice,
      yearlyPrice,
      currency = 'NGN',
      maxProperties,
      maxPhotosPerProperty,
      featuredProperties,
      prioritySupport = false,
      analyticsAccess = false,
      supportLevel,
      trialPeriodDays = 0,
      isRecommended = false,
      features,
      metadata,
      isActive = true
    } = payload;

    if (!name || !monthlyPrice) {
      return {
        success: false,
        message: 'name and monthlyPrice are required',
        statusCode: 400
      };
    }

    const slugBase = providedSlug || toSlug(name);
    let slug = slugBase;
    let duplicateCount = 1;

    while (
      await SubscriptionPlan.findOne({
        where: {
          slug
        }
      })
    ) {
      slug = `${slugBase}-${duplicateCount++}`;
    }

    const plan = await SubscriptionPlan.create({
      name,
      slug,
      planType,
      description,
      monthlyPrice,
      yearlyPrice: yearlyPrice ?? monthlyPrice * 12,
      currency,
      maxProperties,
      maxPhotosPerProperty,
      featuredProperties,
      prioritySupport,
      analyticsAccess,
      supportLevel,
      trialPeriodDays,
      isRecommended,
      features: parseFeatures(features),
      metadata,
      isActive,
      createdBy: null,
      updatedBy: null
    });

    return {
      success: true,
      message: 'Subscription plan created successfully',
      data: toPlain(plan),
      statusCode: 201
    };
  }

  async updatePlan(planId, adminId, payload = {}) {
    await this.ensureDefaultPlans();

    const plan = await SubscriptionPlan.findByPk(planId);

    if (!plan) {
      return {
        success: false,
        message: 'Subscription plan not found',
        statusCode: 404
      };
    }

    const updates = { ...payload };

    if (updates.name && !payload.slug) {
      updates.slug = toSlug(updates.name);
    }

    if (updates.slug) {
      const slugBase = toSlug(updates.slug);
      let slug = slugBase;
      let duplicateCount = 1;

      while (
        await SubscriptionPlan.findOne({
          where: {
            slug,
            id: { [Op.ne]: planId }
          }
        })
      ) {
        slug = `${slugBase}-${duplicateCount++}`;
      }

      updates.slug = slug;
    }

    if (updates.features !== undefined) {
      updates.features = parseFeatures(updates.features);
    }

    if (updates.monthlyPrice && !updates.yearlyPrice && !payload.yearlyPrice) {
      updates.yearlyPrice = Number(updates.monthlyPrice) * 12;
    }

    updates.updatedBy = null;

    await plan.update(updates);

    return {
      success: true,
      message: 'Subscription plan updated successfully',
      data: toPlain(plan),
      statusCode: 200
    };
  }

  async togglePlanStatus(planId, adminId, isActive) {
    const plan = await SubscriptionPlan.findByPk(planId);

    if (!plan) {
      return {
        success: false,
        message: 'Subscription plan not found',
        statusCode: 404
      };
    }

    await plan.update({
      isActive: Boolean(isActive),
      updatedBy: null
    });

    return {
      success: true,
      message: `Subscription plan ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: toPlain(plan),
      statusCode: 200
    };
  }
}

const subscriptionPlanService = new SubscriptionPlanService();
export default subscriptionPlanService;