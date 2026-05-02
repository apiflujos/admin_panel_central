import { Router } from "express";

import {
  authMe,
  changePasswordHandler,
  csrfTokenHandler,
  loginHandler,
  logoutHandler,
} from "./handlers/core-auth";
import {
  googleAdsOAuthCallback,
  googleAdsOAuthStatus,
  startGoogleAdsOAuth,
} from "./handlers/core-google-ads-oauth";
import {
  metaAdsOAuthCallback,
  metaAdsOAuthStatus,
  startMetaAdsOAuth,
} from "./handlers/core-meta-ads-oauth";
import { shopifyOAuthCallback, shopifyOAuthStatus, startShopifyOAuth } from "./handlers/core-shopify-oauth";
import { startTikTokAdsOAuth, tiktokAdsOAuthCallback, tiktokAdsOAuthStatus } from "./handlers/core-tiktok-ads-oauth";
import { createAuthTokenHandler } from "./handlers/auth-tokens";
import { requireAdmin } from "./guards";
import { getCompanyPublicHandler } from "../settings/handlers/core-company";
import {
  createUserHandler,
  deleteUserHandler,
  getProfileHandler,
  listUsersHandler,
  updateProfileHandler,
  updateUserHandler,
} from "./handlers/core-users";
import { getAdminWebSessionHandler } from "./handlers/admin-web-session";
import { wrap } from "../../router-utils";

export function registerPublicAuthRoutes(router: Router) {
  router.post("/auth/login", wrap(loginHandler));
  router.get("/auth/csrf", wrap(csrfTokenHandler));
  router.get("/auth/shopify", wrap(startShopifyOAuth));
  router.get("/auth/shopify/callback", wrap(shopifyOAuthCallback));
  router.get("/auth/google-ads/callback", wrap(googleAdsOAuthCallback));
  router.get("/auth/meta-ads/callback", wrap(metaAdsOAuthCallback));
  router.get("/auth/tiktok-ads/callback", wrap(tiktokAdsOAuthCallback));
  router.get("/company/public", wrap(getCompanyPublicHandler));
}

export function createAuthRouter() {
  const router = Router();

  router.post("/auth/logout", wrap(logoutHandler));
  router.post("/auth/password", wrap(changePasswordHandler));
  router.get("/auth/me", wrap(authMe));
  router.get("/admin-web/session", wrap(getAdminWebSessionHandler));
  router.get("/auth/shopify/status", requireAdmin, wrap(shopifyOAuthStatus));
  router.get("/auth/google-ads/start", requireAdmin, wrap(startGoogleAdsOAuth));
  router.get("/auth/google-ads/status", requireAdmin, wrap(googleAdsOAuthStatus));
  router.get("/auth/meta-ads/start", requireAdmin, wrap(startMetaAdsOAuth));
  router.get("/auth/meta-ads/status", requireAdmin, wrap(metaAdsOAuthStatus));
  router.get("/auth/tiktok-ads/start", requireAdmin, wrap(startTikTokAdsOAuth));
  router.get("/auth/tiktok-ads/status", requireAdmin, wrap(tiktokAdsOAuthStatus));
  router.post("/auth/token", requireAdmin, wrap(createAuthTokenHandler));

  router.get("/profile", wrap(getProfileHandler));
  router.put("/profile", wrap(updateProfileHandler));
  router.get("/users", requireAdmin, wrap(listUsersHandler));
  router.post("/users", requireAdmin, wrap(createUserHandler));
  router.put("/users/:userId", requireAdmin, wrap(updateUserHandler));
  router.delete("/users/:userId", requireAdmin, wrap(deleteUserHandler));

  return router;
}
