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
      {
        path: 'medico/agenda',
        canActivate: [roleGuard(UserRole.MEDICO)],
        loadComponent: () =>
          import('./features/medico/agenda/agenda').then((m) => m.MedicoAgenda),
      },
      {
        path: 'medico/consulta/:pacienteId',
        canActivate: [roleGuard(UserRole.MEDICO)],
        loadComponent: () =>
          import('./features/medico/consulta/consulta').then((m) => m.Consulta),
      },
      {
        path: 'medico/historial/:id',
        canActivate: [roleGuard(UserRole.MEDICO)],
        loadComponent: () =>
          import('./features/historial/historial').then((m) => m.Historial),
      },
      {
        path: 'medico/recetar/:pacienteId',
        canActivate: [roleGuard(UserRole.MEDICO)],
        loadComponent: () =>
          import('./features/medico/recetar/recetar').then((m) => m.Recetar),
      },
      {
        path: 'paciente/historial',
        canActivate: [roleGuard(UserRole.PACIENTE)],
        loadComponent: () =>
          import('./features/historial/historial').then((m) => m.Historial),
      },
      {
        path: 'paciente/mis-recetas',
        canActivate: [roleGuard(UserRole.PACIENTE)],
        loadComponent: () =>
          import('./features/paciente/mis-recetas/mis-recetas').then((m) => m.MisRecetas),
      },
      {
        path: 'paciente/alergias',
        canActivate: [roleGuard(UserRole.PACIENTE)],
        loadComponent: () =>
          import('./features/paciente/alergias/alergias').then((m) => m.Alergias),
      },
      {
        path: 'paciente/reservar',
        canActivate: [roleGuard(UserRole.PACIENTE)],
        loadComponent: () =>
          import('./features/paciente/reservar/reservar').then((m) => m.Reservar),
      },
      {
        path: 'paciente/mis-citas',
        canActivate: [roleGuard(UserRole.PACIENTE)],
        loadComponent: () =>
          import('./features/paciente/mis-citas/mis-citas').then((m) => m.MisCitas),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
