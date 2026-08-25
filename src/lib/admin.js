// ============================================
// ADMIN ALLOWLIST
// Add or remove addresses here. Matching is case-insensitive and checks
// every email on the Clerk account, not just the primary one.
// ============================================

export const ADMIN_EMAILS = [
  "eeharris2004@gmail.com",
  "ethan@empirerealestatefirm.com",
];

export function isAdminEmail(email) {
  if (!email) return false;
  return ADMIN_EMAILS.indexOf(String(email).trim().toLowerCase()) !== -1;
}

// Accepts a Clerk user object from either useUser() or currentUser().
export function isAdminUser(user) {
  if (!user) return false;
  var list = user.emailAddresses || [];
  for (var i = 0; i < list.length; i++) {
    if (isAdminEmail(list[i].emailAddress)) return true;
  }
  if (user.primaryEmailAddress && isAdminEmail(user.primaryEmailAddress.emailAddress)) return true;
  return false;
}
