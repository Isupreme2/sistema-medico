import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/user.model';

interface FeatureCard {
  icon: string;
  title: string;
  desc: string;
  status: 'listo' | 'pronto';
}

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
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

  /** Tarjetas según el rol (refleja el roadmap por fases). */
  readonly cards = computed<FeatureCard[]>(() => {
    switch (this.auth.role()) {
      case UserRole.ADMIN:
        return [
          { icon: '👥', title: 'Gestión de usuarios', desc: 'Crear médicos y administrar cuentas', status: 'pronto' },
          { icon: '📊', title: 'Dashboard analítico', desc: 'Métricas, ausentismo e ingresos', status: 'pronto' },
          { icon: '🛡️', title: 'Auditoría', desc: 'Bitácora de accesos y cambios', status: 'pronto' },
        ];
      case UserRole.MEDICO:
        return [
          { icon: '🗓️', title: 'Mi agenda', desc: 'Citas del día y la semana', status: 'pronto' },
          { icon: '📋', title: 'Historias clínicas', desc: 'Consultas y diagnósticos', status: 'pronto' },
          { icon: '💊', title: 'Recetas digitales', desc: 'Emitir recetas con QR de verificación', status: 'pronto' },
        ];
      case UserRole.PACIENTE:
        return [
          { icon: '📅', title: 'Reservar cita', desc: 'Calendario con horarios disponibles', status: 'pronto' },
          { icon: '🩺', title: 'Mi historial', desc: 'Consultas y signos vitales', status: 'pronto' },
          { icon: '💊', title: 'Mis recetas', desc: 'Descarga tus recetas en PDF', status: 'pronto' },
        ];
      default:
        return [];
    }
  });

  logout(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }
}
