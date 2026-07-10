import { Component, ChangeDetectionStrategy, computed, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { AppointmentService } from '../../core/services/appointment.service';
import { UserRole } from '../../core/models/user.model';
import { Appointment } from '../../core/models/appointment.model';

interface FeatureCard {
  icon: string;
  title: string;
  desc: string;
  status: 'listo' | 'pronto';
  link?: string;
}

interface QuickStat {
  label: string;
  value: number | string;
  icon: 'chart' | 'mail' | 'calendar' | 'medico';
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private auth = inject(AuthService);
  private notifications = inject(NotificationService);
  private appointmentService = inject(AppointmentService);

  readonly user = this.auth.user;
  readonly unreadCount = this.notifications.unread;

  private readonly allAppointments = signal<Appointment[]>([]);

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

  readonly isMedico = computed(() => this.auth.role() === UserRole.MEDICO);
  readonly isPaciente = computed(() => this.auth.role() === UserRole.PACIENTE);
  readonly isAdmin = computed(() => this.auth.role() === UserRole.ADMIN);
  readonly isRecepcionista = computed(() => this.auth.role() === UserRole.RECEPCIONISTA);

  readonly pacientesHoy = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.allAppointments().filter(c => {
      const appointmentDate = new Date(c.fechaHora).toISOString().split('T')[0];
      return appointmentDate === today;
    }).length;
  });

  readonly citasPendientes = computed(() => {
    return this.allAppointments().filter(c => c.estado === 'reservada').length;
  });

  readonly proximaCita = computed(() => {
    const now = new Date();
    const futuras = this.allAppointments()
      .filter(c => c.estado === 'reservada' && new Date(c.fechaHora) > now)
      .sort((a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime());
    return futuras.length > 0 ? futuras[0] : null;
  });

  readonly proximaCitaLabel = computed(() => {
    const cita = this.proximaCita();
    if (!cita) return 'Sin citas';
    const fecha = new Date(cita.fechaHora);
    return fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
  });

  readonly citasTotales = computed(() => {
    return this.allAppointments().filter(c => c.estado === 'atendida').length;
  });

  readonly quickStats = computed<QuickStat[]>(() => {
    if (this.isMedico()) {
      return [
        { label: 'Pacientes Hoy', value: this.pacientesHoy(), icon: 'chart' },
        { label: 'Citas Pendientes', value: this.citasPendientes(), icon: 'chart' },
        { label: 'Mensajes Nuevos', value: this.unreadCount(), icon: 'mail' },
      ];
    }
    if (this.isPaciente()) {
      return [
        { label: 'Próxima Cita', value: this.proximaCitaLabel(), icon: 'calendar' },
        { label: 'Citas Totales', value: this.citasTotales(), icon: 'chart' },
        { label: 'Notificaciones Nuevas', value: this.unreadCount(), icon: 'mail' },
      ];
    }
    return [];
  });

  ngOnInit(): void {
    if (this.isMedico() || this.isPaciente()) {
      this.loadAppointments();
    }
  }

  private loadAppointments(): void {
    this.appointmentService.list().subscribe({
      next: (citas) => this.allAppointments.set(citas),
      error: () => this.allAppointments.set([]),
    });
  }

  /** Tarjetas según el rol (refleja el roadmap por fases). */
  readonly cards = computed<FeatureCard[]>(() => {
    switch (this.auth.role()) {
      case UserRole.ADMIN:
        return [
          { icon: 'grafico', title: 'Panel analítico', desc: 'Métricas, ausentismo e ingresos', status: 'listo', link: '/admin/analitica' },
          { icon: 'medico', title: 'Gestión de médicos', desc: 'Crear y administrar médicos', status: 'listo', link: '/admin/medicos' },
          { icon: 'recepcionista', title: 'Cuentas de recepción', desc: 'Crea y administra Registradores', status: 'listo', link: '/admin/recepcionistas' },
          { icon: 'tipo-cita', title: 'Tipos de cita', desc: 'Catálogo de tipos y duraciones', status: 'listo', link: '/admin/tipos-cita' },
          { icon: 'calendario', title: 'Agendar cita', desc: 'Reserva citas a nombre de pacientes', status: 'listo', link: '/recepcion/agendar' },
          { icon: 'cita', title: 'Citas', desc: 'Todas las citas de la clínica', status: 'listo', link: '/recepcion/citas' },
          { icon: 'paciente', title: 'Pacientes', desc: 'Busca y registra pacientes', status: 'listo', link: '/recepcion/pacientes' },
          { icon: 'factura', title: 'Facturación', desc: 'Comprobantes y cobros', status: 'listo', link: '/admin/facturacion' },
          { icon: 'auditoria', title: 'Auditoría', desc: 'Bitácora de acciones del sistema', status: 'listo', link: '/admin/auditoria' },
        ];
      case UserRole.RECEPCIONISTA:
        return [
          { icon: 'agendar-cita', title: 'Agendar cita', desc: 'Reserva citas a nombre de pacientes', status: 'listo', link: '/recepcion/agendar' },
          { icon: 'cita', title: 'Citas', desc: 'Todas las citas de la clínica', status: 'listo', link: '/recepcion/citas' },
          { icon: 'paciente', title: 'Pacientes', desc: 'Busca y registra pacientes', status: 'listo', link: '/recepcion/pacientes' },
          { icon: 'factura', title: 'Facturación', desc: 'Emite comprobantes y registra cobros', status: 'listo', link: '/recepcion/facturacion' },
        ];
      case UserRole.MEDICO:
        return [
          { icon: 'calendario', title: 'Mi agenda', desc: 'Citas con pacientes y su estado', status: 'listo', link: '/medico/agenda' },
          { icon: 'clock', title: 'Mi horario', desc: 'Consulta tu horario (lo define la Dirección)', status: 'listo', link: '/medico/horario' },
          { icon: 'pastilla', title: 'Recetas digitales', desc: 'Emite recetas desde tu agenda', status: 'listo', link: '/medico/agenda' },
        ];
      case UserRole.PACIENTE:
        return [
          { icon: 'calendario', title: 'Reservar cita', desc: 'Calendario con horarios disponibles', status: 'listo', link: '/paciente/reservar' },
          { icon: 'clock', title: 'Mis citas', desc: 'Tus reservas y su historial', status: 'listo', link: '/paciente/mis-citas' },
          { icon: 'documento', title: 'Mi historial', desc: 'Consultas y signos vitales', status: 'listo', link: '/paciente/historial' },
          { icon: 'pastilla', title: 'Mis recetas', desc: 'Descarga tus recetas en PDF', status: 'listo', link: '/paciente/mis-recetas' },
          { icon: 'grafico', title: 'Mis facturas', desc: 'Comprobantes y estado de pago', status: 'listo', link: '/paciente/mis-facturas' },
          { icon: 'perfil', title: 'Mis alergias', desc: 'Regístralas para tu seguridad', status: 'listo', link: '/paciente/alergias' },
        ];
      default:
        return [];
    }
  });
}
