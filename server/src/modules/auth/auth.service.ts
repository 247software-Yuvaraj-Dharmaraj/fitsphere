import bcrypt from 'bcryptjs';
import { RefreshToken, User, type IUser } from '../../models/index.js';
import { HttpError } from '../../middleware/error.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../utils/jwt.js';
import type { SignupInput, SigninInput } from './auth.schema.js';

// Shape returned to the client — never leak the password hash.
function toPublicUser(user: IUser) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    mobile: user.mobile,
    role: user.role,
    // Fallback for accounts created before preferences existed.
    preferences: user.preferences ?? { theme: 'light', density: 'comfortable', locale: 'en' },
  };
}

function issueTokens(user: IUser) {
  const payload = { sub: user._id.toString(), role: user.role };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

async function persistRefreshToken(userId: string, token: string) {
  // Refresh TTL is 7d; store an expiry so the TTL index can reap it.
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await RefreshToken.create({ token, user: userId, expiresAt });
}

export async function signup(input: SignupInput) {
  const existing = await User.findOne({ email: input.email.toLowerCase() });
  if (existing) throw new HttpError(409, 'An account with this email already exists');

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await User.create({
    name: input.name,
    email: input.email.toLowerCase(),
    mobile: input.mobile,
    passwordHash,
    role: input.role ?? 'MEMBER',
  });

  const tokens = issueTokens(user);
  await persistRefreshToken(user._id.toString(), tokens.refreshToken);
  return { user: toPublicUser(user), ...tokens };
}

export async function signin(input: SigninInput) {
  const user = await User.findOne({ email: input.email.toLowerCase() });
  if (!user) throw new HttpError(401, 'Invalid email or password');

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) throw new HttpError(401, 'Invalid email or password');

  const tokens = issueTokens(user);
  await persistRefreshToken(user._id.toString(), tokens.refreshToken);
  return { user: toPublicUser(user), ...tokens };
}

export async function refresh(token: string) {
  // Token must be valid AND still present in the store (supports revocation).
  const stored = await RefreshToken.findOne({ token });
  if (!stored) throw new HttpError(401, 'Invalid refresh token');

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    await RefreshToken.deleteOne({ token });
    throw new HttpError(401, 'Expired refresh token');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw new HttpError(401, 'User no longer exists');

  // Rotate: invalidate the old token, issue a fresh pair.
  await RefreshToken.deleteOne({ token });
  const tokens = issueTokens(user);
  await persistRefreshToken(user._id.toString(), tokens.refreshToken);
  return { user: toPublicUser(user), ...tokens };
}

export async function logout(token: string) {
  await RefreshToken.deleteOne({ token });
}

export async function getMe(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw new HttpError(404, 'User not found');
  return toPublicUser(user);
}

export async function updatePreferences(
  userId: string,
  prefs: Partial<{ theme: 'light' | 'dark'; density: 'comfortable' | 'compact'; locale: string }>,
) {
  const user = await User.findById(userId);
  if (!user) throw new HttpError(404, 'User not found');
  if (prefs.theme) user.preferences.theme = prefs.theme;
  if (prefs.density) user.preferences.density = prefs.density;
  if (prefs.locale) user.preferences.locale = prefs.locale;
  await user.save();
  return toPublicUser(user);
}
