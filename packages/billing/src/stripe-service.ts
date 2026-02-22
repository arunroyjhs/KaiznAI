import Stripe from 'stripe';
import { getPlan, type Plan } from './plans.js';

export interface BillingConfig {
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  successUrl: string;
  cancelUrl: string;
}

export interface Subscription {
  id: string;
  orgId: string;
  planId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete';
  currentPeriodEnd: Date;
}

export interface SubscriptionStore {
  getByOrgId(orgId: string): Promise<Subscription | null>;
  upsert(subscription: Omit<Subscription, 'id'>): Promise<Subscription>;
  updateStatus(stripeSubscriptionId: string, status: Subscription['status'], currentPeriodEnd: Date): Promise<void>;
}

export class BillingService {
  private stripe: Stripe;

  constructor(
    private config: BillingConfig,
    private store: SubscriptionStore,
  ) {
    this.stripe = new Stripe(config.stripeSecretKey);
  }

  /**
   * Create a Stripe Checkout session for upgrading to a paid plan.
   */
  async createCheckoutSession(
    orgId: string,
    planId: string,
    email: string,
  ): Promise<{ url: string }> {
    const plan = getPlan(planId);
    if (!plan.stripePriceId) {
      throw new Error('Cannot create checkout for free plan');
    }

    const existing = await this.store.getByOrgId(orgId);

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: existing ? undefined : email,
      customer: existing?.stripeCustomerId ?? undefined,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: this.config.successUrl,
      cancel_url: this.config.cancelUrl,
      metadata: { orgId, planId },
    });

    return { url: session.url! };
  }

  /**
   * Create a Stripe Customer Portal session for managing billing.
   */
  async createPortalSession(orgId: string): Promise<{ url: string }> {
    const subscription = await this.store.getByOrgId(orgId);
    if (!subscription) {
      throw new Error('No subscription found for org');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: this.config.successUrl,
    });

    return { url: session.url };
  }

  /**
   * Handle Stripe webhook events.
   */
  async handleWebhook(payload: string | Buffer, signature: string): Promise<void> {
    const event = this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.config.stripeWebhookSecret,
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.orgId;
        const planId = session.metadata?.planId;
        if (orgId && planId && session.subscription) {
          const sub = await this.stripe.subscriptions.retrieve(session.subscription as string);
          await this.store.upsert({
            orgId,
            planId,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: sub.id,
            status: 'active',
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        await this.store.updateStatus(
          sub.id,
          sub.status as Subscription['status'],
          new Date(sub.current_period_end * 1000),
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await this.store.updateStatus(sub.id, 'canceled', new Date(sub.current_period_end * 1000));
        break;
      }
    }
  }

  /**
   * Check if an org's usage is within plan limits.
   */
  async checkLimit(
    orgId: string,
    limitKey: keyof import('./plans.js').PlanLimits,
    currentUsage: number,
  ): Promise<{ allowed: boolean; limit: number; current: number }> {
    const subscription = await this.store.getByOrgId(orgId);
    const planId = subscription?.planId ?? 'free';
    const plan = getPlan(planId);
    const limit = plan.limits[limitKey];

    if (typeof limit !== 'number') {
      return { allowed: true, limit: Infinity, current: currentUsage };
    }

    return {
      allowed: currentUsage < limit,
      limit: limit as number,
      current: currentUsage,
    };
  }
}
