import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { User, AuthResponse, LoginCredentials } from '../models/user.model';

const ACCESS_TOKEN_KEY = 'wc_access_token';
const REFRESH_TOKEN_KEY = 'wc_refresh_token';
const USER_KEY = 'wc_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private _user = signal<User | null>(this.loadUser());
  private _isRefreshing = false;
  private refreshSubject = new BehaviorSubject<string | null>(null);

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly isAdmin = computed(() => this._user()?.role === 'admin');

  private loadUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  private saveTokens(response: AuthResponse): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    this._user.set(response.user);
  }

  private clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._user.set(null);
  }

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/login', credentials).pipe(
      tap(response => this.saveTokens(response)),
      catchError(err => throwError(() => err))
    );
  }

  logout(): void {
    const token = this.getAccessToken();
    if (token) {
      this.http.post('/api/auth/logout', {}).subscribe({ error: () => {} });
    }
    this.clearTokens();
    this.router.navigate(['/login']);
  }

  refreshTokens(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.clearTokens();
      return throwError(() => new Error('No refresh token'));
    }
    return this.http.post<AuthResponse>('/api/auth/refresh', { refreshToken }).pipe(
      tap(response => this.saveTokens(response)),
      catchError(err => {
        this.clearTokens();
        this.router.navigate(['/login']);
        return throwError(() => err);
      })
    );
  }

  handleRefresh(): Observable<string> {
    if (this._isRefreshing) {
      return this.refreshSubject.asObservable().pipe(
        switchMap(token => token
          ? new Observable<string>(o => { o.next(token); o.complete(); })
          : throwError(() => new Error('Refresh failed'))
        )
      );
    }
    this._isRefreshing = true;
    this.refreshSubject.next(null);
    return this.refreshTokens().pipe(
      tap(r => {
        this._isRefreshing = false;
        this.refreshSubject.next(r.accessToken);
      }),
      switchMap(r => {
        const obs = new Observable<string>(o => { o.next(r.accessToken); o.complete(); });
        return obs;
      }),
      catchError(err => {
        this._isRefreshing = false;
        return throwError(() => err);
      })
    );
  }

  getProfile(): Observable<User> {
    return this.http.get<User>('/api/auth/me');
  }

  forgotPassword(email: string): Observable<{ tempPassword: string; name: string; message: string }> {
    return this.http.post<{ tempPassword: string; name: string; message: string }>('/api/auth/forgot-password', { email });
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>('/api/auth/password', { currentPassword, newPassword });
  }
}
