export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  themeColor: string | null;
  isAdmin: boolean;
  hasPassword: boolean;
}

export interface UpdateProfileInput {
  name?: string;
  avatarUrl?: string | null;
  themeColor?: string | null;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}
