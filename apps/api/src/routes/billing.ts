import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PLANS } from '@outcome-runtime/billing';
import { getBillingService, subscriptionStore } from '../services.js';

const checkoutSchema = z.object({
  planId: z.enum(['pro', 'team', 'enterprise']),
  orgId: z.string().uuid(),
  email: z.string().email(),
});

export async function billingRoutes(app: FastifyInstance) {
  // Get available plans
  app.get('/api/v1/billing/plans', async (_request, reply) => {
    const plans = Object.values(PLANS).map((plan) => ({
      id: plan.id,
      name: plan.name,
      monthlyPrice: plan.monthlyPrice,
      limits: plan.limits,
    }));
    return reply.send({ plans });
  });

  // Get current subscription
  app.get('/api/v1/billing/subscription', async (request, reply) => {
    const query = request.query as { orgId?: string };
    if (!query.orgId) {
      return reply.send({ subscription: null, planId: 'free' });
    }

    const subscription = await subscriptionStore.getByOrgId(query.orgId);
    return reply.send({
      subscription,
      planId: subscription?.planId ?? 'free',
    });
  });

  // Create checkout session
  app.post('/api/v1/billing/checkout', async (request, reply) => {
    const result = checkoutSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', details: result.error.issues });
    }

    const billingService = getBillingService();
    if (!billingService) {
      return reply.status(503).send({
        error: 'SERVICE_UNAVAILABLE',
        message: 'Billing is not configured. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.',
      });
    }

    try {
      const session = await billingService.createCheckoutSession(
        result.data.orgId,
        result.data.planId,
        result.data.email,
      );
      return reply.send(session);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create checkout session';
      return reply.status(400).send({ error: 'CHECKOUT_ERROR', message });
    }
  });

  // Create portal session
  app.post('/api/v1/billing/portal', async (request, reply) => {
    const body = request.body as { orgId?: string };
    if (!body.orgId) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'orgId is required' });
    }

    const billingService = getBillingService();
    if (!billingService) {
      return reply.status(503).send({
        error: 'SERVICE_UNAVAILABLE',
        message: 'Billing is not configured. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.',
      });
    }

    try {
      const session = await billingService.createPortalSession(body.orgId);
      return reply.send(session);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create portal session';
      return reply.status(400).send({ error: 'PORTAL_ERROR', message });
    }
  });

  // Stripe webhook
  app.post('/api/v1/billing/webhook', async (request, reply) => {
    const signature = request.headers['stripe-signature'] as string;
    if (!signature) {
      return reply.status(400).send({ error: 'Missing stripe-signature header' });
    }

    const billingService = getBillingService();
    if (!billingService) {
      return reply.status(503).send({
        error: 'SERVICE_UNAVAILABLE',
        message: 'Billing is not configured',
      });
    }

    try {
      const rawBody = request.body as string | Buffer;
      await billingService.handleWebhook(rawBody, signature);
      return reply.send({ received: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Webhook processing failed';
      return reply.status(400).send({ error: 'WEBHOOK_ERROR', message });
    }
  });
}
