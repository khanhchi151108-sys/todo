/**
 * Admin authorization utilities and whitelist configuration.
 */

export const ADMIN_IDENTIFIERS = [
  'khanhchi',
  'khanhchi151108',
  'khanhchi151108-sys',
  'admin'
];

export function checkIsAdmin(user) {
  if (!user) return false;
  if (user.is_admin === true) return true;
  const username = (user.name || user.username || '').toLowerCase().trim();
  const email = (user.email || '').toLowerCase().trim();
  return ADMIN_IDENTIFIERS.some(id => 
    username === id || email.split('@')[0] === id
  );
}
