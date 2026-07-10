import { Component, OnInit, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ThemeService } from '../services/theme.service';
import { NotificationService } from '../services/notification.service';
import { NotificationBell } from './notification-bell/notification-bell';
import { UserRole } from '../models/user.model';

interface NavLink {
  label: string;
  path: string;
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NotificationBell],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell implements OnInit {
  private auth = inject(AuthService);
  private notifications = inject(NotificationService);
  private router = inject(Router);
  readonly theme = inject(ThemeService);

  readonly user = this.auth.user;

  ngOnInit(): void {
    this.notifications.start();
  }

  readonly roleLabel = computed(() => {
    switch (this.auth.role()) {
      case UserRole.ADMIN:
        return 'Director / Administrador';
      case UserRole.RECEPCIONISTA:
        return 'Recepción';
      case UserRole.MEDICO:
        return 'Médico';
      case UserRole.PACIENTE:
        return 'Paciente';
      default:
        return '';
    }
  });

  readonly links = computed<NavLink[]>(() => {
    const base: NavLink[] = [{ label: 'Inicio', path: '/dashboard' }];
    switch (this.auth.role()) {
      case UserRole.ADMIN:
        return [
          ...base,
          { label: 'Analítica', path: '/admin/analitica' },
          { label: 'Médicos', path: '/admin/medicos' },
          { label: 'Recepcionistas', path: '/admin/recepcionistas' },
          { label: 'Tipos de cita', path: '/admin/tipos-cita' },
          { label: 'Agendar cita', path: '/recepcion/agendar' },
          { label: 'Citas', path: '/recepcion/citas' },
          { label: 'Pacientes', path: '/recepcion/pacientes' },
          { label: 'Facturación', path: '/admin/facturacion' },
          { label: 'Auditoría', path: '/admin/auditoria' },
        ];
      case UserRole.RECEPCIONISTA:
        return [
          ...base,
          { label: 'Agendar cita', path: '/recepcion/agendar' },
          { label: 'Citas', path: '/recepcion/citas' },
          { label: 'Pacientes', path: '/recepcion/pacientes' },
          { label: 'Facturación', path: '/recepcion/facturacion' },
        ];
      case UserRole.MEDICO:
        return [
          ...base,
          { label: 'Mi agenda', path: '/medico/agenda' },
          { label: 'Mi horario', path: '/medico/horario' },
        ];
      case UserRole.PACIENTE:
        return [
          ...base,
          { label: 'Reservar cita', path: '/paciente/reservar' },
          { label: 'Mis citas', path: '/paciente/mis-citas' },
          { label: 'Mi historial', path: '/paciente/historial' },
          { label: 'Mis recetas', path: '/paciente/mis-recetas' },
          { label: 'Mis facturas', path: '/paciente/mis-facturas' },
          { label: 'Mis alergias', path: '/paciente/alergias' },
        ];
      default:
        return base;
    }
  });

  logout(): void {
    this.notifications.stop();
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }
}
