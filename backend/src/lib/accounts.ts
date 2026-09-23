export const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@test.com';

export function isAdminEmail(email: string): boolean {
  const admin = process.env.ADMIN_EMAIL;
  if (!admin || email !== admin) return false;

  return email !== TEST_USER_EMAIL;
}
