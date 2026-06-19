import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from './auth.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { registerSchema, loginSchema } from './auth.validation';

const router = Router();

/** Límite estricto en endpoints sensibles para frenar fuerza bruta. */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Demasiados intentos, intenta más tarde' },
});

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Registro de paciente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, nombre, apellido]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               nombre: { type: string }
 *               apellido: { type: string }
 *               telefono: { type: string }
 *     responses:
 *       201: { description: Usuario creado }
 *       409: { description: Email ya registrado }
 */
router.post('/register', authLimiter, validate(registerSchema), authController.register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Inicio de sesión (devuelve access token + cookie de refresh)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *               totp: { type: string, description: "Código 2FA si está activo" }
 *     responses:
 *       200: { description: Sesión iniciada }
 *       401: { description: Credenciales inválidas }
 */
router.post('/login', authLimiter, validate(loginSchema), authController.login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Renueva el access token usando la cookie de refresh
 *     responses:
 *       200: { description: Nuevo access token }
 *       401: { description: Sin sesión válida }
 */
router.post('/refresh', authController.refresh);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Cierra la sesión e invalida los refresh tokens
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Sesión cerrada }
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Perfil del usuario autenticado
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Datos del usuario }
 *       401: { description: No autenticado }
 */
router.get('/me', authenticate, authController.me);

/**
 * @openapi
 * /auth/2fa/setup:
 *   post:
 *     tags: [Auth]
 *     summary: Inicia configuración de 2FA (devuelve QR)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: QR y otpauth URL }
 */
router.post('/2fa/setup', authenticate, authController.setup2FA);

/**
 * @openapi
 * /auth/2fa/enable:
 *   post:
 *     tags: [Auth]
 *     summary: Activa 2FA confirmando un código TOTP
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: 2FA activado }
 */
router.post('/2fa/enable', authenticate, authController.enable2FA);

export default router;
