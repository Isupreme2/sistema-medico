import { Injectable, NgZone, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SlotChange } from '../models/appointment.model';

/** URL base del servidor de sockets (mismo host que la API, sin el prefijo). */
const SOCKET_URL = environment.apiUrl.replace(/\/api\/v1\/?$/, '');

@Injectable({ providedIn: 'root' })
export class SocketService {
  private zone = inject(NgZone);
  private socket: Socket | null = null;

  private connect(): Socket {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, { withCredentials: true });
    }
    return this.socket;
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
}
