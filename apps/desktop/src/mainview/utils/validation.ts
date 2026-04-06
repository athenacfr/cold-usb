// Password and form validation using Zod

import { z } from "zod";

// Password requirements
export const PASSWORD_MIN_LENGTH = 12;

// Individual password rule checks
export const passwordRules = {
  minLength: (password: string) => password.length >= PASSWORD_MIN_LENGTH,
  hasUppercase: (password: string) => /[A-Z]/.test(password),
  hasLowercase: (password: string) => /[a-z]/.test(password),
  hasNumber: (password: string) => /[0-9]/.test(password),
  hasSpecial: (password: string) => /[^A-Za-z0-9]/.test(password),
};

// Rule descriptions for UI
export const passwordRuleDescriptions = {
  minLength: `At least ${PASSWORD_MIN_LENGTH} characters`,
  hasUppercase: "At least one uppercase letter (A-Z)",
  hasLowercase: "At least one lowercase letter (a-z)",
  hasNumber: "At least one number (0-9)",
  hasSpecial: "Special character (optional, for extra strength)",
};

// Password schema with detailed error messages
export const passwordSchema = z
  .string()
  .min(
    PASSWORD_MIN_LENGTH,
    `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
  )
  .refine(passwordRules.hasUppercase, {
    message: "Password must contain at least one uppercase letter",
  })
  .refine(passwordRules.hasLowercase, {
    message: "Password must contain at least one lowercase letter",
  })
  .refine(passwordRules.hasNumber, {
    message: "Password must contain at least one number",
  });

// Schema for password with confirmation
export const passwordWithConfirmSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Get validation state for each rule
export interface PasswordValidationState {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  isValid: boolean;
}

export function getPasswordValidationState(
  password: string,
): PasswordValidationState {
  const state = {
    minLength: passwordRules.minLength(password),
    hasUppercase: passwordRules.hasUppercase(password),
    hasLowercase: passwordRules.hasLowercase(password),
    hasNumber: passwordRules.hasNumber(password),
    hasSpecial: passwordRules.hasSpecial(password),
  };

  return {
    ...state,
    isValid:
      state.minLength &&
      state.hasUppercase &&
      state.hasLowercase &&
      state.hasNumber,
  };
}

// Calculate password strength (0-5)
export function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  if (password.length === 0) {
    return { score: 0, label: "", color: "" };
  }

  if (password.length < 8) {
    return { score: 1, label: "Too short", color: "text-alert-red" };
  }

  let score = 0;
  if (passwordRules.minLength(password)) score++;
  if (passwordRules.hasUppercase(password)) score++;
  if (passwordRules.hasLowercase(password)) score++;
  if (passwordRules.hasNumber(password)) score++;
  if (passwordRules.hasSpecial(password)) score++;
  if (password.length >= 16) score++;

  if (score < 3) {
    return { score, label: "Weak", color: "text-alert-red" };
  }
  if (score < 4) {
    return { score, label: "Fair", color: "text-bitcoin-orange" };
  }
  if (score < 5) {
    return { score, label: "Good", color: "text-terminal-green" };
  }
  return { score, label: "Strong", color: "text-terminal-green" };
}

// Validate full form
export function validatePasswordForm(
  password: string,
  confirmPassword: string,
): {
  isValid: boolean;
  errors: string[];
} {
  const result = passwordWithConfirmSchema.safeParse({
    password,
    confirmPassword,
  });

  if (result.success) {
    return { isValid: true, errors: [] };
  }

  const errors = result.error.issues.map((issue) => issue.message);

  return { isValid: false, errors };
}
