import { Injectable, signal } from '@angular/core';

const THEME_KEY = 'theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private _current = signal<'light' | 'dark'>(this.load());

  readonly current = this._current.asReadonly();

  constructor() {
    this.apply(this._current());
  }

  toggle(): void {
    const next = this._current() === 'light' ? 'dark' : 'light';
    this._current.set(next);
    this.save(next);
    this.apply(next);
  }

  set(theme: 'light' | 'dark'): void {
    this._current.set(theme);
    this.save(theme);
    this.apply(theme);
  }

  private apply(theme: string): void {
    document.documentElement.setAttribute('data-theme', theme);
  }

  private load(): 'light' | 'dark' {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
    return 'light';
  }

  private save(theme: string): void {
    localStorage.setItem(THEME_KEY, theme);
  }
}
