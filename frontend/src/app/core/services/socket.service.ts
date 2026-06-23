import { Injectable, NgZone, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SlotChange } from '../models/appointment.model';
import { AppNotification } from '../models/notification.model';
import { AuthService } from './auth.service';

/** URL base del servidor de sockets (mismo host que la API, sin el prefijo). */
const SOCKET_URL = environment.apiUrl.replace(/\/api\/v1\/?$/, '');

@Injectable({ providedIn: 'root' })
export class SocketService {
  private zone = inject(NgZone);
  private auth = inject(AuthService);
  private socket: Socket | null = null;

  private connect(): Socket {
    if (!this.socket) {
      // El servidor exige el access token en el handshake (autentica la sala).
      this.socket = io(SOCKET_URL, {
        withCredentials: true,
        auth: { token: this.auth.accessToken ?? '' },
      });
    }
    return this.socket;
  }

  /** Cierra el socket (al cerrar sesión) para que el siguiente login reconecte con su token. */
  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  /** Se suscribe a los cambios de slots de un médico y emite cada cambio. */
  watchMedico(medicoId: string): Observable<SlotChange> {
    const socket = this.connect();
    socket.emit('watch:medico', medicoId);

    return new Observable<SlotChange>((subscriber) => {
      const handler = (change: SlotChange) =>
        this.zone.run(() => subscriber.next(change));
      socket.on('appointment:changed', handler);

      return () => {
        socket.off('appointment:changed', handler);
        socket.emit('unwatch:medico', medicoId);
      };
    });
  }

  /** Se suscribe a las notificaciones en tiempo real del usuario autenticado. */
  watchUser(userId: string): Observable<AppNotification> {
    const socket = this.connect();
    socket.emit('watch:user', userId);

    return new Observable<AppNotification>((subscriber) => {
      const handler = (noti: AppNotification) =>
        this.zone.run(() => subscriber.next(noti));
      socket.on('notification:new', handler);

      return () => {
        socket.off('notification:new', handler);
        socket.emit('unwatch:user', userId);
      };
    });
  }
}
