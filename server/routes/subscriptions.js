import db from '../db.js';

/**
 * POST /api/subscriptions/subscribe
 *
 * Creates a new subscription.
 */
export function subscribe(req, res) {
  const { user_id, plan_id, coupon_id } = req.body;

  if (!user_id || !plan_id) {
    return res.status(400).json({ error: 'User ID and Plan ID are required' });
  }

  try {
    const createSubscription = db.transaction((data) => {
      const { user_id, plan_id, coupon_id } = data;

      // 1. Fetch the plan
      const plan = db.query('SELECT * FROM plans WHERE id = ?').get(plan_id);
      if (!plan) {
        throw new Error('Invalid plan ID');
      }

      let final_price = plan.price;
      let applied_coupon_id = null;

      // 2. Process coupon if provided
      if (coupon_id) {
        const coupon = db.query('SELECT * FROM coupons WHERE id = ?').get(coupon_id);
        
        if (!coupon) {
          throw new Error('Invalid coupon ID');
        }
        
        if (coupon.current_uses >= coupon.max_uses) {
          throw new Error('Coupon usage limit reached');
        }

        // Apply discount
        const discountAmount = Math.floor((plan.price * coupon.discount_percent) / 100);
        final_price = plan.price - discountAmount;
        applied_coupon_id = coupon.id;

        // Increment coupon usage
        const updateResult = db.query(`
          UPDATE coupons 
          SET current_uses = current_uses + 1 
          WHERE id = ? AND current_uses < max_uses
        `).run(coupon.id);

        if (updateResult.changes === 0) {
          throw new Error('Failed to apply coupon, it may have reached its usage limit concurrently');
        }
      }

      // 3. Create the subscription
      const insertResult = db.query(`
        INSERT INTO subscriptions (user_id, plan_id, coupon_id, final_price, status)
        VALUES (?, ?, ?, ?, 'active')
      `).run(user_id, plan_id, applied_coupon_id, final_price);

      // 4. Fetch the created subscription to return
      const subscription = db.query(`
        SELECT s.*, p.name as plan_name, c.code as coupon_code, p.price as original_price
        FROM subscriptions s
        JOIN plans p ON s.plan_id = p.id
        LEFT JOIN coupons c ON s.coupon_id = c.id
        WHERE s.id = ?
      `).get(insertResult.lastInsertRowid);

      return subscription;
    });

    const result = createSubscription({ user_id, plan_id, coupon_id });
    res.status(201).json({ success: true, subscription: result });

  } catch (error) {
    console.error('Error creating subscription:', error);
    
    // Map specific errors to appropriate HTTP status codes
    if (error.message === 'Invalid plan ID' || error.message === 'Invalid coupon ID') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Coupon usage limit reached') || error.message.includes('concurrently')) {
      return res.status(400).json({ error: 'Coupon is no longer available' });
    }
    
    res.status(500).json({ error: 'Internal server error while processing subscription' });
  }
}
