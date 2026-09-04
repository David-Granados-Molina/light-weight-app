export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  themeColor: string | null;
  isAdmin: boolean;
}

export interface UpdateProfileInput {
  name?: string;
  avatarUrl?: string | null;
  themeColor?: string | null;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

/**
 * Respuesta al pedir un código.
 *
 * `delivered` es `false` cuando el servidor no tiene el correo configurado: el
 * código existe, pero está en su log y no en ningún buzón. La pantalla necesita
 * saberlo para no mandar a nadie a mirar su email.
 */
export interface RequestCodeResponse {
  delivered: boolean;
  message: string;
}
