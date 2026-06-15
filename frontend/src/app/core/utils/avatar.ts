export const AVATAR_IDS = Array.from({ length: 6 }, (_, i) => `avatar:${i + 1}`);

/** Convierte un identificador "avatar:N" en la ruta de su imagen, o null si no hay avatar. */
export function avatarSrc(avatarId: string | null | undefined): string | null {
  const match = avatarId ? /^avatar:([1-6])$/.exec(avatarId) : null;
  return match ? `/avatars/avatar-${match[1]}.svg` : null;
}
