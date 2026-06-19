import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AppointmentService } from '../../../core/services/appointment.service';
import { VideoAccess } from '../../../core/models/appointment.model';

/** Tipado mínimo de la External API de Jitsi Meet. */
interface JitsiApi {
  addEventListener(event: string, listener: (...args: unknown[]) => void): void;
  dispose(): void;
}
declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => JitsiApi;
  }
}

@Component({
  selector: 'app-teleconsulta-sala',
  imports: [DatePipe],
  templateUrl: './sala.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './sala.scss',
})
export class TeleconsultaSala implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(AppointmentService);

  private readonly container = viewChild<ElementRef<HTMLDivElement>>('jitsi');

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly video = signal<VideoAccess | null>(null);
  readonly enLlamada = signal(false);

  private api: JitsiApi | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('appointmentId');
    if (!id) {
      this.error.set('Cita no especificada.');
      this.loading.set(false);
      return;
    }
    this.service.videoAccess(id).subscribe({
      next: (v) => {
        this.video.set(v);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? 'No se pudo acceder a la teleconsulta.');
        this.loading.set(false);
      },
    });
  }

  /** Carga el script de Jitsi (una sola vez) y monta la videollamada. */
  async entrar(): Promise<void> {
    const v = this.video();
    const node = this.container()?.nativeElement;
    if (!v || !v.canJoin || !node) return;

    try {
      await this.cargarScript(v.domain);
      if (!window.JitsiMeetExternalAPI) {
        this.error.set('No se pudo cargar el componente de video.');
        return;
      }
      this.enLlamada.set(true);
      this.api = new window.JitsiMeetExternalAPI(v.domain, {
        roomName: v.room,
        parentNode: node,
        width: '100%',
        height: 560,
        userInfo: { displayName: v.displayName },
        configOverwrite: { prejoinPageEnabled: false, disableDeepLinking: true },
        interfaceConfigOverwrite: { MOBILE_APP_PROMO: false },
      });
      this.api.addEventListener('readyToClose', () => this.salir());
    } catch {
      this.error.set('No se pudo iniciar la videollamada.');
      this.enLlamada.set(false);
    }
  }

  salir(): void {
    this.api?.dispose();
    this.api = null;
    this.enLlamada.set(false);
    this.router.navigate(['/dashboard']);
  }

  private cargarScript(domain: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.JitsiMeetExternalAPI) return resolve();
      const src = `https://${domain}/external_api.js`;
      const existente = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
      if (existente) {
        existente.addEventListener('load', () => resolve());
        existente.addEventListener('error', () => reject());
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject();
      document.body.appendChild(script);
    });
  }

  ngOnDestroy(): void {
    this.api?.dispose();
    this.api = null;
  }
}
