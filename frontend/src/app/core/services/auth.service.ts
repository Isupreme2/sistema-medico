import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  LoginRequest,
  RegisterRequest,
  User,
  UserRole,
} from '../models/user.model';

const TOKEN_KEY = 'ehr_access_token';
const USER_KEY = 'ehr_user';

interface LoginData {
  user: User;
  accessToken: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/auth`;

  // --- Estado reactivo (signals) ---
  private _user = signal<User | null>(this.readUser());
  private _accessToken = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly role = computed<UserRole | null>(() => this._user()?.rol ?? null);

  get accessToken(): string | null {
    return this._accessToken();
  }

  // --- Acciones ---
  login(payload: LoginRequest): Observable<ApiResponse<LoginData>> {
    return this.http
      .post<ApiResponse<LoginData>>(`${this.api}/login`, payload, {
        withCredentials: true,
      })
      .pipe(tap((res) => this.setSession(res.data.user, res.data.accessToken)));
  }

  register(payload: RegisterRequest): Observable<ApiResponse<{ user: User }>> {
    return this.http.post<ApiResponse<{ user: User }>>(`${this.api}/register`, payload);
  }

  /** Renueva el access token usando la cookie httpOnly de refresh. */
  refresh(): Observable<ApiResponse<{ accessToken: string }>> {
    return this.http
      .post<ApiResponse<{ accessToken: string }>>(
        `${this.api}/refresh`,
        {},
        { withCredentials: true },
      )
      .pipe(tap((res) => this.setToken(res.data.accessToken)));
  }

  fetchMe(): Observable<ApiResponse<{ user: User }>> {
    return this.http
      .get<ApiResponse<{ user: User }>>(`${this.api}/me`)
      .pipe(tap((res) => this._user.set(res.data.user)));
  }

  updateMe(payload: { telefono?: string; alergias?: string[] }): Observable<User> {
    return this.http
      .patch<ApiResponse<{ user: User }>>(`${this.api}/me`, payload)
      .pipe(
        tap((res) => {
          this._user.set(res.data.user);
          localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
        }),
        map((res) => res.data.user),
      );
  }

  logout(): Observable<unknown> {
    return this.http
      .post(`${this.api}/logout`, {}, { withCredentials: true })
      .pipe(tap(() => this.clearSession()));
  }

  hasRole(...roles: UserRole[]): boolean {
    const r = this.role();
    return r !== null && roles.includes(r);
  }

  // --- Helpers de sesión ---
  setToken(token: string): void {
    this._accessToken.set(token);
    localStorage.setItem(TOKEN_KEY, token);
  }

  private setSession(user: User, token: string): void {
    this._user.set(user);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.setToken(token);
  }

  clearSession(): void {
    this._user.set(null);
    this._accessToken.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  private readUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    try {
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }
}
