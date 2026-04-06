import React from 'react';
import { Input } from './Input';
import {
  getPasswordValidationState,
  getPasswordStrength,
  passwordRuleDescriptions,
} from '../../utils/validation';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  showRules?: boolean;
  showStrength?: boolean;
  className?: string;
}

interface PasswordConfirmInputProps {
  password: string;
  confirmPassword: string;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
  showRules?: boolean;
  showStrength?: boolean;
  className?: string;
}

// Rule indicator component
const RuleIndicator: React.FC<{
  met: boolean;
  description: string;
  showWhenEmpty?: boolean;
  password: string;
}> = ({ met, description, showWhenEmpty = false, password }) => {
  // Don't show anything if password is empty and showWhenEmpty is false
  if (password.length === 0 && !showWhenEmpty) {
    return (
      <div className="flex items-center gap-2 text-muted-gray">
        <span className="w-4 h-4 flex items-center justify-center text-xs">○</span>
        <span className="font-mono text-xs">{description}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${met ? 'text-terminal-green' : 'text-alert-red'}`}>
      <span className="w-4 h-4 flex items-center justify-center text-xs">
        {met ? '✓' : '✗'}
      </span>
      <span className="font-mono text-xs">{description}</span>
    </div>
  );
};

// Strength bar component
const StrengthBar: React.FC<{ score: number; label: string; color: string }> = ({
  score,
  label,
  color,
}) => {
  if (!label) return null;

  return (
    <div className="mt-2">
      <div className="flex justify-between items-center mb-1">
        <span className="font-mono text-xs text-muted-gray">Strength:</span>
        <span className={`font-mono text-xs ${color}`}>{label}</span>
      </div>
      <div className="h-1 bg-muted-gray/30 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            score < 3 ? 'bg-alert-red' : score < 5 ? 'bg-bitcoin-orange' : 'bg-terminal-green'
          }`}
          style={{ width: `${(score / 6) * 100}%` }}
        />
      </div>
    </div>
  );
};

// Single password input with validation
export const PasswordInput: React.FC<PasswordInputProps> = ({
  value,
  onChange,
  label = 'Password',
  placeholder = 'Enter password',
  showRules = true,
  showStrength = true,
  className = '',
}) => {
  const validationState = getPasswordValidationState(value);
  const strength = getPasswordStrength(value);

  return (
    <div className={className}>
      <Input
        type="password"
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full"
      />

      {showStrength && value.length > 0 && (
        <StrengthBar score={strength.score} label={strength.label} color={strength.color} />
      )}

      {showRules && (
        <div className="mt-3 space-y-1 p-3 bg-hacker-black/50 border border-muted-gray/30">
          <p className="font-mono text-xs text-muted-gray mb-2">Password requirements:</p>
          <RuleIndicator
            met={validationState.minLength}
            description={passwordRuleDescriptions.minLength}
            password={value}
          />
          <RuleIndicator
            met={validationState.hasUppercase}
            description={passwordRuleDescriptions.hasUppercase}
            password={value}
          />
          <RuleIndicator
            met={validationState.hasLowercase}
            description={passwordRuleDescriptions.hasLowercase}
            password={value}
          />
          <RuleIndicator
            met={validationState.hasNumber}
            description={passwordRuleDescriptions.hasNumber}
            password={value}
          />
          <RuleIndicator
            met={validationState.hasSpecial}
            description={`${passwordRuleDescriptions.hasSpecial} ${validationState.hasSpecial ? '' : '(optional)'}`}
            password={value}
          />
        </div>
      )}
    </div>
  );
};

// Password with confirmation input
export const PasswordConfirmInput: React.FC<PasswordConfirmInputProps> = ({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmChange,
  showRules = true,
  showStrength = true,
  className = '',
}) => {
  const validationState = getPasswordValidationState(password);
  const strength = getPasswordStrength(password);
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Password field */}
      <div>
        <Input
          type="password"
          label="Password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder="Enter password"
          className="w-full"
        />

        {showStrength && password.length > 0 && (
          <StrengthBar score={strength.score} label={strength.label} color={strength.color} />
        )}

        {showRules && (
          <div className="mt-3 space-y-1 p-3 bg-hacker-black/50 border border-muted-gray/30">
            <p className="font-mono text-xs text-muted-gray mb-2">Password requirements:</p>
            <RuleIndicator
              met={validationState.minLength}
              description={passwordRuleDescriptions.minLength}
              password={password}
            />
            <RuleIndicator
              met={validationState.hasUppercase}
              description={passwordRuleDescriptions.hasUppercase}
              password={password}
            />
            <RuleIndicator
              met={validationState.hasLowercase}
              description={passwordRuleDescriptions.hasLowercase}
              password={password}
            />
            <RuleIndicator
              met={validationState.hasNumber}
              description={passwordRuleDescriptions.hasNumber}
              password={password}
            />
            <RuleIndicator
              met={validationState.hasSpecial}
              description={`${passwordRuleDescriptions.hasSpecial} ${validationState.hasSpecial ? '' : '(optional)'}`}
              password={password}
            />
          </div>
        )}
      </div>

      {/* Confirm password field */}
      <div>
        <Input
          type="password"
          label="Confirm Password"
          value={confirmPassword}
          onChange={(e) => onConfirmChange(e.target.value)}
          placeholder="Confirm password"
          className="w-full"
        />

        {confirmPassword.length > 0 && (
          <div className={`mt-1 flex items-center gap-2 ${passwordsMatch ? 'text-terminal-green' : 'text-alert-red'}`}>
            <span className="text-xs">{passwordsMatch ? '✓' : '✗'}</span>
            <span className="font-mono text-xs">
              {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// Export validation state getter for use in parent components
export { getPasswordValidationState, getPasswordStrength };
