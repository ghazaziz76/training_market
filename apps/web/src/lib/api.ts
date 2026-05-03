const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: { field?: string; message: string; code?: string }[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem('auth-tokens');
      if (!stored) return null;
      const tokens = JSON.parse(stored);
      return tokens.access_token || null;
    } catch {
      return null;
    }
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem('auth-tokens');
      if (!stored) return null;
      const tokens = JSON.parse(stored);
      return tokens.refresh_token || null;
    } catch {
      return null;
    }
  }

  private async refreshAccessToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${BASE_URL}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) return null;

      const json = await res.json();
      if (json.success && json.data) {
        // Merge new access token with existing tokens to preserve refresh_token
        const existing = JSON.parse(localStorage.getItem('auth-tokens') || '{}');
        const merged = { ...existing, ...json.data };
        localStorage.setItem('auth-tokens', JSON.stringify(merged));
        return json.data.access_token;
      }
      return null;
    } catch {
      return null;
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    retry = true,
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    // Handle 401 — try refresh once
    if (res.status === 401 && retry) {
      const newToken = await this.refreshAccessToken();
      if (newToken) {
        return this.request<T>(method, path, body, false);
      }
      // Refresh failed — clear auth
      localStorage.removeItem('auth-tokens');
      localStorage.removeItem('auth-user');
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }

    const json = await res.json().catch(() => ({
      success: false,
      message: 'Network error',
    }));

    if (!res.ok && !json.message) {
      json.message = `Request failed with status ${res.status}`;
    }

    return json as ApiResponse<T>;
  }

  get<T>(path: string) {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>('POST', path, body);
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>('PUT', path, body);
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>('PATCH', path, body);
  }

  delete<T>(path: string) {
    return this.request<T>('DELETE', path);
  }
}

export const api = new ApiClient();
export type { ApiResponse };
