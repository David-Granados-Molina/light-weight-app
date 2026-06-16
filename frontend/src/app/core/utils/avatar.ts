export const AVATAR_IDS = Array.from({ length: 9 }, (_, i) => `avatar:${i + 1}`);

/** Convierte un identificador "avatar:N" en la ruta de su imagen, o null si no hay avatar. */
export function avatarSrc(avatarId: string | null | undefined): string | null {
  const match = avatarId ? /^avatar:([1-9])$/.exec(avatarId) : null;
  if (!match) return null;
  const n = parseInt(match[1]);
  return `/avatars/avatar-${n}.svg`;
}
