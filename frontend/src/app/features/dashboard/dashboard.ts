import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/user.model';

interface FeatureCard {
  icon: string;
  title: string;
  desc: string;
  status: 'listo' | 'pronto';
  link?: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private auth = inject(AuthService);

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
          { icon: '👨‍⚕️', title: 'Gestión de médicos', desc: 'Crear y administrar médicos', status: 'listo', link: '/admin/medicos' },
          { icon: '🏷️', title: 'Tipos de cita', desc: 'Catálogo de tipos y duraciones', status: 'listo', link: '/admin/tipos-cita' },
          { icon: '📊', title: 'Dashboard analítico', desc: 'Métricas, ausentismo e ingresos', status: 'pronto' },
        ];
      case UserRole.MEDICO:
        return [
          { icon: '⏰', title: 'Mi horario', desc: 'Configura tu horario y bloqueos', status: 'listo', link: '/medico/horario' },
          { icon: '🗓️', title: 'Mi agenda', desc: 'Citas del día y la semana', status: 'pronto' },
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
}
