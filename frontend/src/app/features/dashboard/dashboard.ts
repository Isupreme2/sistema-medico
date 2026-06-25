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

  /** Tarjetas según el rol (refleja el roadmap por fases). */
  readonly cards = computed<FeatureCard[]>(() => {
    switch (this.auth.role()) {
      case UserRole.ADMIN:
        return [
          { icon: '📊', title: 'Panel analítico', desc: 'Métricas, ausentismo e ingresos', status: 'listo', link: '/admin/analitica' },
          { icon: '👨‍⚕️', title: 'Gestión de médicos', desc: 'Crear y administrar médicos', status: 'listo', link: '/admin/medicos' },
          { icon: '🏷️', title: 'Tipos de cita', desc: 'Catálogo de tipos y duraciones', status: 'listo', link: '/admin/tipos-cita' },
          { icon: '🗓️', title: 'Agendar cita', desc: 'Reserva citas a nombre de pacientes', status: 'listo', link: '/recepcion/agendar' },
          { icon: '📋', title: 'Citas', desc: 'Todas las citas de la clínica', status: 'listo', link: '/recepcion/citas' },
          { icon: '🧑‍🤝‍🧑', title: 'Pacientes', desc: 'Busca y registra pacientes', status: 'listo', link: '/recepcion/pacientes' },
          { icon: '🧾', title: 'Facturación', desc: 'Comprobantes y cobros', status: 'listo', link: '/admin/facturacion' },
          { icon: '🛡️', title: 'Auditoría', desc: 'Bitácora de acciones del sistema', status: 'listo', link: '/admin/auditoria' },
        ];
      case UserRole.RECEPCIONISTA:
        return [
          { icon: '🗓️', title: 'Agendar cita', desc: 'Reserva citas a nombre de pacientes', status: 'listo', link: '/recepcion/agendar' },
          { icon: '📋', title: 'Citas', desc: 'Todas las citas de la clínica', status: 'listo', link: '/recepcion/citas' },
          { icon: '🧑‍🤝‍🧑', title: 'Pacientes', desc: 'Busca y registra pacientes', status: 'listo', link: '/recepcion/pacientes' },
          { icon: '🧾', title: 'Facturación', desc: 'Emite comprobantes y registra cobros', status: 'listo', link: '/recepcion/facturacion' },
        ];
      case UserRole.MEDICO:
        return [
          { icon: '🗓️', title: 'Mi agenda', desc: 'Citas con pacientes y su estado', status: 'listo', link: '/medico/agenda' },
          { icon: '⏰', title: 'Mi horario', desc: 'Configura tu horario y bloqueos', status: 'listo', link: '/medico/horario' },
          { icon: '💊', title: 'Recetas digitales', desc: 'Emite recetas desde tu agenda', status: 'listo', link: '/medico/agenda' },
          { icon: '🧾', title: 'Facturación', desc: 'Factura tus consultas', status: 'listo', link: '/medico/facturas' },
        ];
      case UserRole.PACIENTE:
        return [
          { icon: '📅', title: 'Reservar cita', desc: 'Calendario con horarios disponibles', status: 'listo', link: '/paciente/reservar' },
          { icon: '📋', title: 'Mis citas', desc: 'Tus reservas y su historial', status: 'listo', link: '/paciente/mis-citas' },
          { icon: '🩺', title: 'Mi historial', desc: 'Consultas y signos vitales', status: 'listo', link: '/paciente/historial' },
          { icon: '💊', title: 'Mis recetas', desc: 'Descarga tus recetas en PDF', status: 'listo', link: '/paciente/mis-recetas' },
          { icon: '🧾', title: 'Mis facturas', desc: 'Comprobantes y estado de pago', status: 'listo', link: '/paciente/mis-facturas' },
          { icon: '⚠️', title: 'Mis alergias', desc: 'Regístralas para tu seguridad', status: 'listo', link: '/paciente/alergias' },
        ];
      default:
        return [];
    }
  });
}
