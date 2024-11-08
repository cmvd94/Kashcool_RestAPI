import {redisClient} from '../config/redisDbTTL'; // Adjust the import based on your project structure
import { UserCustomRequest } from '../types/customRequest'; // Adjust the path as necessary

export const clearUserTokens = async (userId: string ) => {
 
  const tokenSetKey = `parentTokens:${userId}`; // User's token set key
  const existingTokens = await redisClient.sMembers(tokenSetKey); // Get all tokens for this user

  // Remove all tokens from Redis
  for (const tokenKey of existingTokens) {
    await redisClient.del(tokenKey);
  }

  // Clear the token set for this user
  await redisClient.del(tokenSetKey);
};