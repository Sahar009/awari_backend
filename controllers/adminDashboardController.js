import * as adminDashboardService from '../services/adminDashboardService.js';

const respond = (res, result) => {
  const statusCode = result?.statusCode || (result?.success ? 200 : 500);
  return res.status(statusCode).json({
    success: result?.success ?? false,
    message: result?.message,
    data: result?.data,
    error: result?.error
  });
};

export const getOverviewStats = async (req, res) => {
  const result = await adminDashboardService.getOverviewStats(req.query);
  return respond(res, result);
};

export const getUsers = async (req, res) => {
  const result = await adminDashboardService.getUsers(req.query);
  return respond(res, result);
};

export const createAdminUser = async (req, res) => {
  const adminId = req.user.id;
  const result = await adminDashboardService.createAdminUser(adminId, req.body);
  return respond(res, result);
};

export const updateUserStatus = async (req, res) => {
  const adminId = req.user.id;
  const { userId } = req.params;
  const result = await adminDashboardService.updateUserStatus(adminId, userId, req.body);
  return respond(res, result);
};

export const getUserDetails = async (req, res) => {
  const { userId } = req.params;
  const result = await adminDashboardService.getUserDetails(userId);
  return respond(res, result);
};

export const getPendingProperties = async (req, res) => {
  const result = await adminDashboardService.getPendingProperties(req.query);
  return respond(res, result);
};

export const getProperties = async (req, res) => {
  const result = await adminDashboardService.getProperties(req.query);
  return respond(res, result);
};

export const getPropertyDetails = async (req, res) => {
  const { propertyId } = req.params;
  const result = await adminDashboardService.getPropertyDetails(propertyId);
  return respond(res, result);
};

export const updatePropertyStatus = async (req, res) => {
  const adminId = req.user.id;
  const { propertyId } = req.params;
  const result = await adminDashboardService.updatePropertyStatus(adminId, propertyId, req.body);
  return respond(res, result);
};

export const updatePropertyFeature = async (req, res) => {
  const adminId = req.user.id;
  const { propertyId } = req.params;
  const result = await adminDashboardService.updatePropertyFeature(adminId, propertyId, req.body);
  return respond(res, result);
};

export const moderateProperty = async (req, res) => {
  const adminId = req.user.id;
  const { propertyId } = req.params;
  const result = await adminDashboardService.moderateProperty(adminId, propertyId, req.body);
  return respond(res, result);
};

export const getSubscriptions = async (req, res) => {
  const result = await adminDashboardService.getSubscriptions(req.query);
  return respond(res, result);
};

export const getSubscriptionDetail = async (req, res) => {
  const { subscriptionId } = req.params;
  const result = await adminDashboardService.getSubscriptionDetail(subscriptionId);
  return respond(res, result);
};

export const createSubscription = async (req, res) => {
  const adminId = req.user.id;
  const result = await adminDashboardService.createSubscription(adminId, req.body);
  return respond(res, result);
};

export const updateSubscription = async (req, res) => {
  const adminId = req.user.id;
  const { subscriptionId } = req.params;
  const result = await adminDashboardService.updateSubscription(adminId, subscriptionId, req.body);
  return respond(res, result);
};

export const cancelSubscription = async (req, res) => {
  const adminId = req.user.id;
  const { subscriptionId } = req.params;
  const result = await adminDashboardService.cancelSubscription(adminId, subscriptionId, req.body);
  return respond(res, result);
};

export const renewSubscription = async (req, res) => {
  const adminId = req.user.id;
  const { subscriptionId } = req.params;
  const result = await adminDashboardService.renewSubscription(adminId, subscriptionId, req.body);
  return respond(res, result);
};

export const getSubscriptionPlans = async (req, res) => {
  const result = await adminDashboardService.getSubscriptionPlans(req.query);
  return respond(res, result);
};

export const getSubscriptionPlanDetail = async (req, res) => {
  const { planId } = req.params;
  const result = await adminDashboardService.getSubscriptionPlanDetail(planId);
  return respond(res, result);
};

export const createSubscriptionPlan = async (req, res) => {
  const adminId = req.user.id;
  const result = await adminDashboardService.createSubscriptionPlan(adminId, req.body);
  return respond(res, result);
};

export const updateSubscriptionPlan = async (req, res) => {
  const adminId = req.user.id;
  const { planId } = req.params;
  const result = await adminDashboardService.updateSubscriptionPlan(adminId, planId, req.body);
  return respond(res, result);
};

export const toggleSubscriptionPlanStatus = async (req, res) => {
  const adminId = req.user.id;
  const { planId } = req.params;
  const result = await adminDashboardService.toggleSubscriptionPlanStatus(adminId, planId, req.body);
  return respond(res, result);
};

export const getReportsMetrics = async (req, res) => {
  const result = await adminDashboardService.getReportsMetrics(req.query);
  return respond(res, result);
};

export const updateUserRole = async (req, res) => {
  const adminId = req.user.id;
  const { userId } = req.params;
  const { role } = req.body;
  const result = await adminDashboardService.updateUserRole(adminId, userId, role);
  return respond(res, result);
};

export const updateUserProfile = async (req, res) => {
  const adminId = req.user.id;
  const { userId } = req.params;
  const result = await adminDashboardService.updateUserProfile(adminId, userId, req.body);
  return respond(res, result);
};

export const getModerationOverview = async (req, res) => {
  const result = await adminDashboardService.getModerationOverview();
  return respond(res, result);
};

export const getModerationReviews = async (req, res) => {
  const result = await adminDashboardService.getModerationReviews(req.query);
  return respond(res, result);
};

export const getModerationListings = async (req, res) => {
  const result = await adminDashboardService.getModerationListings(req.query);
  return respond(res, result);
};

export const getModerationKycDocuments = async (req, res) => {
  const result = await adminDashboardService.getModerationKycDocuments(req.query);
  return respond(res, result);
};

export const getModerationPayments = async (req, res) => {
  const result = await adminDashboardService.getModerationPayments(req.query);
  return respond(res, result);
};

export const updateKycDocument = async (req, res) => {
  const adminId = req.user.id;
  const { documentId } = req.params;
  const result = await adminDashboardService.updateKycDocument(adminId, documentId, req.body);
  return respond(res, result);
};

export const getTransactions = async (req, res) => {
  const result = await adminDashboardService.getTransactions(req.query);
  return respond(res, result);
};

export const getLoginSnapshot = async (req, res) => {
  const result = await adminDashboardService.getLoginSnapshot();
  return respond(res, result);
};


