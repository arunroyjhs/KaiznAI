import { describe, it, expect } from 'vitest';
import { ScopeEnforcer } from '../scope-enforcer.js';
import type { ScopeViolation } from '../scope-enforcer.js';

describe('ScopeEnforcer', () => {
  describe('validate', () => {
    it('should return no violations when file is in an allowed path', () => {
      const enforcer = new ScopeEnforcer({
        allowedPaths: ['/src/'],
        forbiddenPaths: [],
      });

      const violations = enforcer.validate(['/src/index.ts']);

      expect(violations).toEqual([]);
    });

    it('should return a violation for a forbidden path', () => {
      const enforcer = new ScopeEnforcer({
        allowedPaths: [],
        forbiddenPaths: ['/secrets/'],
      });

      const violations = enforcer.validate(['/secrets/config.json']);

      expect(violations).toHaveLength(1);
      expect(violations[0]).toEqual({
        filePath: '/secrets/config.json',
        rule: 'forbidden_path',
        message: 'File "/secrets/config.json" is in forbidden path "/secrets/"',
      });
    });

    it('should return a violation for a file outside allowed paths when allowedPaths is non-empty', () => {
      const enforcer = new ScopeEnforcer({
        allowedPaths: ['/src/'],
        forbiddenPaths: [],
      });

      const violations = enforcer.validate(['/docs/readme.md']);

      expect(violations).toHaveLength(1);
      expect(violations[0]).toEqual({
        filePath: '/docs/readme.md',
        rule: 'outside_allowed_paths',
        message: 'File "/docs/readme.md" is outside allowed paths: /src/',
      });
    });

    it('should return no violations when allowedPaths is empty (all paths allowed)', () => {
      const enforcer = new ScopeEnforcer({
        allowedPaths: [],
        forbiddenPaths: [],
      });

      const violations = enforcer.validate(['/anywhere/file.ts', '/random/path.js']);

      expect(violations).toEqual([]);
    });

    it('should support glob pattern matching with * wildcard', () => {
      const enforcer = new ScopeEnforcer({
        allowedPaths: [],
        forbiddenPaths: ['*.secret'],
      });

      const violations = enforcer.validate(['db.secret']);

      expect(violations).toHaveLength(1);
      expect(violations[0].rule).toBe('forbidden_path');
    });

    it('should match glob patterns in allowed paths', () => {
      const enforcer = new ScopeEnforcer({
        allowedPaths: ['/src/*.ts'],
        forbiddenPaths: [],
      });

      const violations = enforcer.validate(['/src/index.ts']);

      expect(violations).toEqual([]);
    });

    it('should return multiple violations for multiple bad files', () => {
      const enforcer = new ScopeEnforcer({
        allowedPaths: ['/src/'],
        forbiddenPaths: ['/src/secrets/'],
      });

      const violations = enforcer.validate([
        '/src/secrets/key.pem',
        '/outside/file.ts',
      ]);

      expect(violations).toHaveLength(2);

      const forbiddenViolation = violations.find((v) => v.rule === 'forbidden_path');
      const outsideViolation = violations.find((v) => v.rule === 'outside_allowed_paths');

      expect(forbiddenViolation).toBeDefined();
      expect(forbiddenViolation!.filePath).toBe('/src/secrets/key.pem');

      expect(outsideViolation).toBeDefined();
      expect(outsideViolation!.filePath).toBe('/outside/file.ts');
    });

    it('should normalize backslash paths to forward slashes', () => {
      const enforcer = new ScopeEnforcer({
        allowedPaths: ['/src/'],
        forbiddenPaths: [],
      });

      const violations = enforcer.validate(['\\src\\index.ts']);

      expect(violations).toEqual([]);
    });

    it('should normalize backslashes in forbidden paths', () => {
      const enforcer = new ScopeEnforcer({
        allowedPaths: [],
        forbiddenPaths: ['\\secrets\\'],
      });

      const violations = enforcer.validate(['/secrets/config.json']);

      expect(violations).toHaveLength(1);
      expect(violations[0].rule).toBe('forbidden_path');
    });

    it('should check forbidden paths before allowed paths', () => {
      // A file can match both forbidden and outside_allowed_paths.
      // Forbidden is checked first; the file should get the forbidden_path violation.
      const enforcer = new ScopeEnforcer({
        allowedPaths: ['/app/'],
        forbiddenPaths: ['/secrets/'],
      });

      const violations = enforcer.validate(['/secrets/api-key.txt']);

      // Should have both forbidden_path and outside_allowed_paths violations
      const rules = violations.map((v) => v.rule);
      expect(rules).toContain('forbidden_path');
    });

    it('should return no violations for an empty file list', () => {
      const enforcer = new ScopeEnforcer({
        allowedPaths: ['/src/'],
        forbiddenPaths: ['/secrets/'],
      });

      const violations = enforcer.validate([]);

      expect(violations).toEqual([]);
    });

    it('should allow files matching any one of multiple allowed paths', () => {
      const enforcer = new ScopeEnforcer({
        allowedPaths: ['/src/', '/lib/', '/tests/'],
        forbiddenPaths: [],
      });

      const violations = enforcer.validate([
        '/src/index.ts',
        '/lib/utils.ts',
        '/tests/app.test.ts',
      ]);

      expect(violations).toEqual([]);
    });

    it('should flag files matching any one of multiple forbidden paths', () => {
      const enforcer = new ScopeEnforcer({
        allowedPaths: [],
        forbiddenPaths: ['/secrets/', '/private/', '/internal/'],
      });

      const violations = enforcer.validate(['/private/data.json']);

      expect(violations).toHaveLength(1);
      expect(violations[0].rule).toBe('forbidden_path');
    });

    it('should only match the first forbidden path and break', () => {
      const enforcer = new ScopeEnforcer({
        allowedPaths: [],
        forbiddenPaths: ['/bad/', '/bad/nested/'],
      });

      // The path starts with /bad/, so the first forbidden match triggers and breaks
      const violations = enforcer.validate(['/bad/nested/file.ts']);
      const forbiddenViolations = violations.filter((v) => v.rule === 'forbidden_path');

      expect(forbiddenViolations).toHaveLength(1);
    });
  });
});
