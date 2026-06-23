import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/user.model';
import { AppNotification } from '../models/notification.model';
import { AuthService } from './auth.service';
import { SocketService } from './socket.service';

interface ListData {
  notificaciones: AppNotification[];
  noLeidas: number;
}

/**
 * Gestiona las notificaciones del usuario: carga inicial por HTTP y empuje en
 * tiempo real por Socket.io. Expone signals (lista + contador no leídas) que la
 * campana del shell consume directamente.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private socket = inject(SocketService);
  private api = `${environment.apiUrl}/notifications`;

  private _items = signal<AppNotification[]>([]);
  private _unread = signal(0);
  private sub: Subscription | null = null;

  readonly items = this._items.asReadonly();
  readonly unread = this._unread.asReadonly();
  readonly hasUnread = computed(() => this._unread() > 0);

  /** Carga inicial + suscripción al socket. Idempotente. */
  start(): void {
    const user = this.auth.user();
    if (!user) return;

    this.refresh();

    if (!this.sub) {
      this.sub = this.socket.watchUser(user._id).subscribe((noti) => {
        this._items.update((list) => [noti, ...list].slice(0, 50));
        this._unread.update((n) => n + 1);
      });
    }
  }

  /** Detiene la suscripción y limpia el estado (al cerrar sesión). */
  stop(): void {
    this.sub?.unsubscribe();
    this.sub = null;
    this._items.set([]);
    this._unread.set(0);
    // Cierra el socket para que el próximo login reconecte con su propio token.
    this.socket.disconnect();
  }

  refresh(): void {
    this.http.get<ApiResponse<ListData>>(this.api).subscribe((r) => {
      this._items.set(r.data.notificaciones);
      this._unread.set(r.data.noLeidas);
    });
  }

  markRead(noti: AppNotification): void {
    if (noti.leida) return;
    this.http
      .patch<ApiResponse<unknown>>(`${this.api}/${noti._id}/read`, {})
      .subscribe(() => {
        this._items.update((list) =>
          list.map((n) => (n._id === noti._id ? { ...n, leida: true } : n)),
        );
        this._unread.update((n) => Math.max(0, n - 1));
      });
  }

  markAllRead(): void {
    this.http.patch<ApiResponse<unknown>>(`${this.api}/read-all`, {}).subscribe(() => {
      this._items.update((list) => list.map((n) => ({ ...n, leida: true })));
      this._unread.set(0);
    });
  }
}
