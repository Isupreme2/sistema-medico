import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

interface NavLink {
  label: string;
  path: string;
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly user = this.auth.user;

  readonly roleLabel = computed(() => {
    switch (this.auth.role()) {
      case UserRole.ADMIN:
        return 'Administrador';
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
          { label: 'Médicos', path: '/admin/medicos' },
          { label: 'Tipos de cita', path: '/admin/tipos-cita' },
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
        ];
      default:
        return base;
    }
  });

  logout(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }
}
