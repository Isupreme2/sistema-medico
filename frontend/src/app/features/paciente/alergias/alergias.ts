import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-alergias',
  imports: [],
  templateUrl: './alergias.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './alergias.scss',
})
export class Alergias {
  private auth = inject(AuthService);

  readonly alergias = signal<string[]>([...(this.auth.user()?.alergias ?? [])]);
  readonly nueva = signal('');
  readonly saving = signal(false);
  readonly msg = signal<string | null>(null);

  // Canal de recordatorios por WhatsApp (opt-in del paciente).
  readonly telefono = signal<string>(this.auth.user()?.telefono ?? '');
  readonly notificarWhatsapp = signal<boolean>(this.auth.user()?.notificarWhatsapp ?? true);

  agregar(valor: string): void {
    const v = valor.trim();
    if (v && !this.alergias().some((a) => a.toLowerCase() === v.toLowerCase())) {
      this.alergias.update((list) => [...list, v]);
    }
    this.nueva.set('');
  }

  quitar(a: string): void {
    this.alergias.update((list) => list.filter((x) => x !== a));
  }

  guardar(): void {
    this.saving.set(true);
    this.msg.set(null);
    this.auth
      .updateMe({
        alergias: this.alergias(),
        telefono: this.telefono().trim() || undefined,
        notificarWhatsapp: this.notificarWhatsapp(),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.msg.set('Cambios guardados ✓');
        },
        error: () => this.saving.set(false),
      });
  }
}
