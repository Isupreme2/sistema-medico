import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';
import { UserRole } from './core/models/user.model';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register').then((m) => m.Register),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./core/layout/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'admin/medicos',
        canActivate: [roleGuard(UserRole.ADMIN)],
        loadComponent: () =>
          import('./features/admin/medicos/medicos').then((m) => m.AdminMedicos),
      },
      {
        path: 'admin/tipos-cita',
        canActivate: [roleGuard(UserRole.ADMIN)],
        loadComponent: () =>
          import('./features/admin/tipos-cita/tipos-cita').then((m) => m.AdminTiposCita),
      },
      {
        path: 'medico/horario',
        canActivate: [roleGuard(UserRole.MEDICO)],
        loadComponent: () =>
          import('./features/medico/horario/horario').then((m) => m.MedicoHorario),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
