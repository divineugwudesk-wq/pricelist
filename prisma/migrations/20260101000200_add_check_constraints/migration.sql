-- AddCheckConstraints
--
-- The schema stores role, plan, status, eventType, type and category as free
-- text. That lets a bad row through, and a single corrupt value 500s the
-- product-creation path because `PLANS[plan].maxProducts` is dereferenced
-- without optional chaining. These CHECK constraints make the database the
-- authority on what values are legal, so nothing outside the allow-list can
-- be written.

ALTER TABLE "User" ADD CONSTRAINT "User_role_check"
  CHECK ("role" IN ('USER', 'ADMIN'));

ALTER TABLE "Business" ADD CONSTRAINT "Business_category_check"
  CHECK ("category" IN (
    'FASHION', 'BEAUTY', 'FOOD', 'ELECTRONICS', 'RESTAURANT',
    'SERVICES', 'RETAIL', 'HEALTH_WELLNESS', 'HOME_FURNITURE',
    'AUTOMOTIVE', 'PROFESSIONAL_SERVICES', 'OTHER'
  ));

ALTER TABLE "Product" ADD CONSTRAINT "Product_type_check"
  CHECK ("type" IN ('PRODUCT', 'SERVICE'));

ALTER TABLE "Order" ADD CONSTRAINT "Order_status_check"
  CHECK ("status" IN ('NEW', 'CONTACTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'));

ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_plan_check"
  CHECK ("plan" IN ('FREE', 'STARTER', 'PRO'));

ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_status_check"
  CHECK ("status" IN (
    'ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELLING',
    'CANCELLED', 'EXPIRED', 'INACTIVE'
  ));

ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_eventType_check"
  CHECK ("eventType" IN ('STORE_VIEW', 'PRODUCT_VIEW', 'WHATSAPP_CLICK'));