export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 24;

export function getPasswordPolicyError(password) {
  const value = String(password || "");

  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`;
  }

  if (value.length > PASSWORD_MAX_LENGTH) {
    return `Password cannot be more than ${PASSWORD_MAX_LENGTH} characters long.`;
  }

  if (/\s/.test(value)) {
    return "Password cannot contain spaces.";
  }

  if (!/[A-Z]/.test(value)) {
    return "Password must contain at least one uppercase letter.";
  }

  if (!/[a-z]/.test(value)) {
    return "Password must contain at least one lowercase letter.";
  }

  if (!/\d/.test(value)) {
    return "Password must contain at least one number.";
  }

  if (!/[^A-Za-z0-9\s]/.test(value)) {
    return "Password must contain at least one special character.";
  }

  return "";
}