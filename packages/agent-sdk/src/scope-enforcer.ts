export interface ScopeRule {
  allowedPaths: string[];
  forbiddenPaths: string[];
}

export interface ScopeViolation {
  filePath: string;
  rule: 'forbidden_path' | 'outside_allowed_paths';
  message: string;
}

export class ScopeEnforcer {
  constructor(private rules: ScopeRule) {}

  /**
   * Validate that a list of file paths are within scope.
   * Returns violations if any paths break rules.
   */
  validate(filePaths: string[]): ScopeViolation[] {
    const violations: ScopeViolation[] = [];

    for (const filePath of filePaths) {
      const normalized = filePath.replace(/\\/g, '/');

      // Check forbidden paths first
      for (const forbidden of this.rules.forbiddenPaths) {
        const normalizedForbidden = forbidden.replace(/\\/g, '/');
        if (normalized.startsWith(normalizedForbidden) || this.matchesGlob(normalized, normalizedForbidden)) {
          violations.push({
            filePath,
            rule: 'forbidden_path',
            message: `File "${filePath}" is in forbidden path "${forbidden}"`,
          });
          break;
        }
      }

      // Check allowed paths (if specified, files must be within at least one)
      if (this.rules.allowedPaths.length > 0) {
        const isAllowed = this.rules.allowedPaths.some((allowed) => {
          const normalizedAllowed = allowed.replace(/\\/g, '/');
          return normalized.startsWith(normalizedAllowed) || this.matchesGlob(normalized, normalizedAllowed);
        });

        if (!isAllowed) {
          violations.push({
            filePath,
            rule: 'outside_allowed_paths',
            message: `File "${filePath}" is outside allowed paths: ${this.rules.allowedPaths.join(', ')}`,
          });
        }
      }
    }

    return violations;
  }

  /**
   * Simple glob matching for path patterns with wildcards.
   */
  private matchesGlob(path: string, pattern: string): boolean {
    if (!pattern.includes('*')) return false;
    const regexStr = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
    return new RegExp(`^${regexStr}$`).test(path);
  }
}
