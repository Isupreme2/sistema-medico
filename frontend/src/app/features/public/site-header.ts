import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';

/** Cabecera del sitio público (sticky, con blur). */
@Component({
  selector: 'app-site-header',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <header class="site-header">
      <div class="container site-header__inner">
        <a routerLink="/" class="brand-logo">
                  <img
  src="assets/logo.png"
  alt="Clínica Cordillera"
  style="width: 90px; height: auto;"
/>
        </a>

        <nav class="site-nav">
          <a routerLink="/especialidades" routerLinkActive="active">Especialidades</a>
          <a routerLink="/equipo" routerLinkActive="active">Equipo Médico</a>
          <a routerLink="/nosotros" routerLinkActive="active">Sobre Nosotros</a>
          <a routerLink="/blog" routerLinkActive="active">Blog</a>
          <a routerLink="/contacto" routerLinkActive="active">Contacto</a>
        </nav>

        <div class="header-actions">
          <a class="tel" href="tel:+51932101485">Emergencias: +51 932 101 485</a>
          <button class="theme-toggle" (click)="theme.toggle()" [attr.aria-label]="theme.current() === 'dark' ? 'Modo claro' : 'Modo oscuro'">
            @if (theme.current() === 'dark') {
              <img src="assets/svg/claro.svg" alt="Modo claro" width="20" height="20" />
            } @else {
              <img src="assets/svg/noche.svg" alt="Modo oscuro" width="20" height="20" />
            }
          </button>
          @if (autenticado()) {
            <a class="link-login" routerLink="/dashboard">Mi panel</a>
          } @else {
            <a class="link-login" routerLink="/login">Ingresar</a>
          }
          <a class="pill" routerLink="/citas">Reservar Cita</a>
        </div>
      </div>
    </header>
  `,
})
export class SiteHeader {
  private auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  readonly autenticado = computed(() => this.auth.isAuthenticated());
}
