import swaggerJSDoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Sistema de Gestión de Consultorios Médicos (EHR) — API',
      version: '0.1.0',
      description:
        'API REST para agendamiento de citas, historia clínica y recetas digitales.',
    },
    servers: [{ url: env.API_PREFIX, description: 'Servidor principal' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    tags: [
      { name: 'Sistema', description: 'Estado y salud del servicio' },
      { name: 'Auth', description: 'Autenticación, sesión y 2FA' },
    ],
  },
  // Lee las anotaciones @openapi de las rutas (en src para dev, en dist para prod)
  apis: ['src/routes/**/*.ts', 'src/modules/**/*.ts', 'dist/routes/**/*.js', 'dist/modules/**/*.js'],
};

export const swaggerSpec = swaggerJSDoc(options);
