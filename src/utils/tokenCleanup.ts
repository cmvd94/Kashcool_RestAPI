import { redisClient } from "../config/redisDbTTL"; // Adjust the import path to your redis client
import mongoose ,{ Document } from "mongoose"; // For type compatibility

/**
 * Generic function to clean up expired tokens.
 * @param user - The user (either Admin or Parent document).
 * @param tokenPrefix - Prefix for the Redis token keys (e.g., "adminTokens" or "parentTokens").
 */
export const cleanUpExpiredTokens = async (user: Document, tokenPrefix: string) => {
  try {
    const tokenSetKey = `${tokenPrefix}:${user._id}`;
    const existingTokens = await redisClient.sMembers(tokenSetKey);

    for (const tokenKey of existingTokens) {
      const tokenExists = await redisClient.exists(tokenKey);
      if (!tokenExists) {
        // If the token has expired, remove it from the set
        await redisClient.sRem(tokenSetKey, tokenKey);
      }
    }

    // Check if there are any remaining tokens for this user
    const remainingTokens = await redisClient.sMembers(tokenSetKey);
    if (remainingTokens.length === 0) {
      // For admin, clear region and grade fields when all tokens expire
      if (tokenPrefix === "adminTokens") {
        if (user instanceof mongoose.Model && 'region' in user) {
          user.region = null;
        }
        if ('grade' in user) {
          user.grade = null;
        }
        await user.save();
      }
      // Do nothing for parent (no fields set to null)
    }

  } catch (error) {
    console.error("Error cleaning up expired tokens:", error);
  }
};
