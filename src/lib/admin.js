// ============================================
// ADMIN ALLOWLIST
// The Advertise Studio and Activity Log are for these addresses only.
// Matching is case-insensitive, and an address only counts once Clerk has
// verified it, so nobody can unlock staff tools by typing your email onto
// their own account.
// ============================================

export const ADMIN_EMAILS = [
  "eeharris2004@gmail.com",
  "ethan@empirerealestatefirm.com",
];

export function isAdminEmail(email) {
  if (!email) return false;
  return ADMIN_EMAILS.indexOf(String(email).trim().toLowerCase()) !== -1;
}

function isVerified(address) {
  return !!(address && address.verification && address.verification.status === "verified");
}

// Accepts a Clerk user object from either useUser() or currentUser().
export function isAdminUser(user) {
  if (!user) return false;
  var list = user.emailAddresses || [];
  for (var i = 0; i < list.length; i++) {
    if (isVerified(list[i]) && isAdminEmail(list[i].emailAddress)) return true;
  }
  return false;
}
