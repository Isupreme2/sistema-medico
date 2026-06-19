import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

/** Permite el paso solo si hay sesión activa. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};

/**
 * Restringe una ruta a ciertos roles.
 * Uso: { path: 'admin', canActivate: [authGuard, roleGuard(UserRole.ADMIN)] }
 * Nota: esto es solo UX; el backend revalida cada petición.
 */
export const roleGuard = (...roles: UserRole[]): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.isAuthenticated() && auth.hasRole(...roles)) {
      return true;
    }
    // Autenticado pero sin permiso → a su dashboard; sin sesión → login
    return router.createUrlTree([auth.isAuthenticated() ? '/dashboard' : '/login']);
  };
};
