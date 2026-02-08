const { supabase } = require("../config/supabase");
const ApiError = require("../utils/ApiError");

/**
 * Middleware that verifies the Supabase JWT from the Authorization header.
 * On success it attaches `req.user` (the Supabase user object)
 * and `req.accessToken` (the raw JWT).
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw ApiError.unauthorized("Missing or malformed Authorization header");
    }

    const token = authHeader.split(" ")[1];

    if (!supabase) {
      throw ApiError.internal("Supabase is not configured");
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw ApiError.unauthorized("Invalid or expired token");
    }

    req.user = user;
    req.accessToken = token;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Optional auth – if a token is present it will be verified and
 * `req.user` will be set. If no token is sent the request continues
 * without a user attached (useful for public endpoints that behave
 * differently for logged-in users).
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ") || !supabase) {
      return next();
    }

    const token = authHeader.split(" ")[1];
    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (user) {
      req.user = user;
      req.accessToken = token;
    }

    next();
  } catch {
    // Token invalid – continue without user
    next();
  }
}

module.exports = { requireAuth, optionalAuth };
