import { describe, it, expect } from 'vitest';
import { PLANS, getPlan } from '../plans.js';
import type { Plan } from '../plans.js';

describe('PLANS', () => {
  it('should contain all four plans: free, pro, team, enterprise', () => {
    expect(PLANS).toHaveProperty('free');
    expect(PLANS).toHaveProperty('pro');
    expect(PLANS).toHaveProperty('team');
    expect(PLANS).toHaveProperty('enterprise');
  });

  it('should contain exactly four plans', () => {
    expect(Object.keys(PLANS)).toHaveLength(4);
  });

  describe('free plan', () => {
    it('should have correct limits', () => {
      const free = PLANS.free;

      expect(free.limits.maxOutcomes).toBe(2);
      expect(free.limits.maxExperimentsPerOutcome).toBe(3);
      expect(free.limits.maxAgents).toBe(1);
      expect(free.limits.maxSignalConnectors).toBe(2);
      expect(free.limits.llmTokensPerMonth).toBe(100_000);
    });

    it('should have no premium features', () => {
      const features = PLANS.free.limits.features;

      expect(features.customConnectors).toBe(false);
      expect(features.ssoSaml).toBe(false);
      expect(features.auditLogs).toBe(false);
      expect(features.prioritySupport).toBe(false);
      expect(features.whiteLabel).toBe(false);
    });

    it('should have zero monthly price', () => {
      expect(PLANS.free.monthlyPrice).toBe(0);
    });

    it('should have correct id and name', () => {
      expect(PLANS.free.id).toBe('free');
      expect(PLANS.free.name).toBe('Free');
    });

    it('should have an empty stripe price id', () => {
      expect(PLANS.free.stripePriceId).toBe('');
    });
  });

  describe('pro plan', () => {
    it('should have correct limits', () => {
      const pro = PLANS.pro;

      expect(pro.limits.maxOutcomes).toBe(20);
      expect(pro.limits.maxExperimentsPerOutcome).toBe(10);
      expect(pro.limits.maxAgents).toBe(5);
      expect(pro.limits.maxSignalConnectors).toBe(10);
      expect(pro.limits.llmTokensPerMonth).toBe(1_000_000);
    });

    it('should have custom connectors and audit logs but not SSO or priority support', () => {
      const features = PLANS.pro.limits.features;

      expect(features.customConnectors).toBe(true);
      expect(features.ssoSaml).toBe(false);
      expect(features.auditLogs).toBe(true);
      expect(features.prioritySupport).toBe(false);
      expect(features.whiteLabel).toBe(false);
    });

    it('should have correct monthly price', () => {
      expect(PLANS.pro.monthlyPrice).toBe(49);
    });

    it('should have correct id and name', () => {
      expect(PLANS.pro.id).toBe('pro');
      expect(PLANS.pro.name).toBe('Pro');
    });
  });

  describe('team plan', () => {
    it('should have correct limits', () => {
      const team = PLANS.team;

      expect(team.limits.maxOutcomes).toBe(100);
      expect(team.limits.maxExperimentsPerOutcome).toBe(20);
      expect(team.limits.maxAgents).toBe(20);
      expect(team.limits.maxSignalConnectors).toBe(50);
      expect(team.limits.llmTokensPerMonth).toBe(10_000_000);
    });

    it('should have all features except white label', () => {
      const features = PLANS.team.limits.features;

      expect(features.customConnectors).toBe(true);
      expect(features.ssoSaml).toBe(true);
      expect(features.auditLogs).toBe(true);
      expect(features.prioritySupport).toBe(true);
      expect(features.whiteLabel).toBe(false);
    });

    it('should have correct monthly price', () => {
      expect(PLANS.team.monthlyPrice).toBe(199);
    });

    it('should have correct id and name', () => {
      expect(PLANS.team.id).toBe('team');
      expect(PLANS.team.name).toBe('Team');
    });
  });

  describe('enterprise plan', () => {
    it('should have Infinity for all numeric limits', () => {
      const enterprise = PLANS.enterprise;

      expect(enterprise.limits.maxOutcomes).toBe(Infinity);
      expect(enterprise.limits.maxExperimentsPerOutcome).toBe(Infinity);
      expect(enterprise.limits.maxAgents).toBe(Infinity);
      expect(enterprise.limits.maxSignalConnectors).toBe(Infinity);
      expect(enterprise.limits.llmTokensPerMonth).toBe(Infinity);
    });

    it('should have all features enabled', () => {
      const features = PLANS.enterprise.limits.features;

      expect(features.customConnectors).toBe(true);
      expect(features.ssoSaml).toBe(true);
      expect(features.auditLogs).toBe(true);
      expect(features.prioritySupport).toBe(true);
      expect(features.whiteLabel).toBe(true);
    });

    it('should have custom pricing indicator (-1)', () => {
      expect(PLANS.enterprise.monthlyPrice).toBe(-1);
    });

    it('should have correct id and name', () => {
      expect(PLANS.enterprise.id).toBe('enterprise');
      expect(PLANS.enterprise.name).toBe('Enterprise');
    });
  });

  describe('plan feature progression', () => {
    it('should have increasing limits from free to team', () => {
      expect(PLANS.free.limits.maxOutcomes).toBeLessThan(PLANS.pro.limits.maxOutcomes);
      expect(PLANS.pro.limits.maxOutcomes).toBeLessThan(PLANS.team.limits.maxOutcomes);
    });

    it('should have increasing agent limits from free to team', () => {
      expect(PLANS.free.limits.maxAgents).toBeLessThan(PLANS.pro.limits.maxAgents);
      expect(PLANS.pro.limits.maxAgents).toBeLessThan(PLANS.team.limits.maxAgents);
    });

    it('should have increasing monthly prices from free to team', () => {
      expect(PLANS.free.monthlyPrice).toBeLessThan(PLANS.pro.monthlyPrice);
      expect(PLANS.pro.monthlyPrice).toBeLessThan(PLANS.team.monthlyPrice);
    });
  });
});

describe('getPlan', () => {
  it('should return the correct plan for each valid plan id', () => {
    expect(getPlan('free')).toBe(PLANS.free);
    expect(getPlan('pro')).toBe(PLANS.pro);
    expect(getPlan('team')).toBe(PLANS.team);
    expect(getPlan('enterprise')).toBe(PLANS.enterprise);
  });

  it('should return a plan with the correct structure', () => {
    const plan = getPlan('free');

    expect(plan).toHaveProperty('id');
    expect(plan).toHaveProperty('name');
    expect(plan).toHaveProperty('stripePriceId');
    expect(plan).toHaveProperty('monthlyPrice');
    expect(plan).toHaveProperty('limits');
    expect(plan.limits).toHaveProperty('maxOutcomes');
    expect(plan.limits).toHaveProperty('maxExperimentsPerOutcome');
    expect(plan.limits).toHaveProperty('maxAgents');
    expect(plan.limits).toHaveProperty('maxSignalConnectors');
    expect(plan.limits).toHaveProperty('llmTokensPerMonth');
    expect(plan.limits).toHaveProperty('features');
  });

  it('should throw for an unknown plan id', () => {
    expect(() => getPlan('nonexistent')).toThrow('Unknown plan: nonexistent');
  });

  it('should throw for an empty string plan id', () => {
    expect(() => getPlan('')).toThrow('Unknown plan: ');
  });

  it('should be case-sensitive (uppercase should fail)', () => {
    expect(() => getPlan('Free')).toThrow('Unknown plan: Free');
    expect(() => getPlan('PRO')).toThrow('Unknown plan: PRO');
  });
});
