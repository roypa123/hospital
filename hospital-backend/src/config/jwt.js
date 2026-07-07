module.exports = {
  accessSecret: process.env.JWT_ACCESS_SECRET || "access_secret_fallback",
  refreshSecret: process.env.JWT_REFRESH_SECRET || "refresh_secret_fallback",
  accessExpiresIn: process.env.ACCESS_TOKEN_EXPIRES || "15m",
  refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES || "7d",
};
