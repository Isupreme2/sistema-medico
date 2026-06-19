import { Component, ChangeDetectionStrategy, HostListener, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from '../../services/notification.service';
import { AppNotification, NOTIFICATION_ICON } from '../../models/notification.model';

@Component({
  selector: 'app-notification-bell',
  imports: [],
  templateUrl: './notification-bell.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './notification-bell.scss',
})
export class NotificationBell {
  private notis = inject(NotificationService);
  private router = inject(Router);

  readonly items = this.notis.items;
  readonly unread = this.notis.unread;
  readonly open = signal(false);
  readonly icon = NOTIFICATION_ICON;

  toggle(event: MouseEvent): void {
    event.stopPropagation();
    this.open.update((v) => !v);
  }

  /** Cierra el panel al hacer clic fuera. */
  @HostListener('document:click')
  onDocClick(): void {
    if (this.open()) this.open.set(false);
  }

  onSelect(noti: AppNotification): void {
    this.notis.markRead(noti);
    this.open.set(false);
    if (noti.link) this.router.navigateByUrl(noti.link);
  }

  marcarTodas(event: MouseEvent): void {
    event.stopPropagation();
    this.notis.markAllRead();
  }

  /** Tiempo relativo simple en español. */
  hace(fecha: string): string {
    const diff = Date.now() - new Date(fecha).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'ahora';
    if (min < 60) return `hace ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `hace ${h} h`;
    const d = Math.floor(h / 24);
    return `hace ${d} d`;
  }
}
