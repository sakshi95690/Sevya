import { User } from '../types';

export function calculateProfileCompleteness(user: User): number {
  if (!user) return 0;
  let score = 0;
  if (user.name && user.name.trim().length > 0) score += 25;
  if (user.email && user.email.trim().length > 0) score += 25;
  if (user.phone && user.phone.trim().length > 0) score += 25;
  if (user.avatarUrl && user.avatarUrl.trim().length > 0) score += 25;
  return score;
}
