import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { AppError } from '../../utils/AppError';
import { env } from '../../config/env';
import * as authService from './auth.service';

const REFRESH_COOKIE = 'refreshToken';
const REFRESH_COOKIE_MAXAGE = 7 * 24 * 60 * 60 * 1000; // 7 días

// SameSite=None solo es válido junto con Secure (requisito del navegador). Por
// eso, si la cookie es cross-site, forzamos Secure aunque COOKIE_SECURE sea false.
const COOKIE_SAMESITE = env.COOKIE_SAMESITE;
const COOKIE_SECURE = env.COOKIE_SECURE || COOKIE_SAMESITE === 'none';

/** Atributos comunes de la cookie de refresh (set y clear deben coincidir). */
function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAMESITE,
    path: env.API_PREFIX + '/auth',
  } as const;
}

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    ...refreshCookieOptions(),
    maxAge: REFRESH_COOKIE_MAXAGE,
  });
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.register(req.body);
  res.status(201).json({ status: 'success', data: { user } });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { user, tokens } = await authService.login(req.body);
  setRefreshCookie(res, tokens.refreshToken);
  res.json({
    status: 'success',
    data: { user, accessToken: tokens.accessToken },
  });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw AppError.unauthorized('No hay sesión activa');

  const tokens = await authService.refresh(token);
  setRefreshCookie(res, tokens.refreshToken);
  res.json({ status: 'success', data: { accessToken: tokens.accessToken } });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (req.user) await authService.logout(req.user.sub);
  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
  res.json({ status: 'success', message: 'Sesión cerrada' });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getMe(req.user!.sub);
  res.json({ status: 'success', data: { user } });
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const { telefono, alergias } = req.body as { telefono?: string; alergias?: string[] };
  const user = await authService.updateMe(req.user!.sub, { telefono, alergias });
  res.json({ status: 'success', data: { user } });
});

export const setup2FA = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.setup2FA(req.user!.sub);
  res.json({ status: 'success', data: result });
});

export const enable2FA = asyncHandler(async (req: Request, res: Response) => {
  const { totp } = req.body as { totp?: string };
  if (!totp) throw AppError.badRequest('El código TOTP es obligatorio');
  await authService.enable2FA(req.user!.sub, totp);
  res.json({ status: 'success', message: '2FA activado correctamente' });
});
