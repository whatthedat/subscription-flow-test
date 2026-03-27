import db from '../db.js';

/**
 * GET /api/coupons
 *
 * Returns all coupons.
 */
export function getCoupons(req, res) {
  try {
    const coupons = db.query('SELECT * FROM coupons').all();
    res.json({ coupons });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/coupons/validate
 *
 * Validates a coupon code and returns discount details if valid.
 */
export function validateCoupon(req, res) {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Coupon code is required' });
  }

  try {
    const coupon = db.query('SELECT * FROM coupons WHERE code = ?').get(code);

    if (!coupon) {
      return res.status(404).json({ error: 'Invalid coupon code' });
    }

    if (coupon.current_uses >= coupon.max_uses) {
      return res.status(400).json({ error: 'Coupon usage limit reached' });
    }

    res.json({ coupon });
  } catch (error) {
    console.error('Error validating coupon:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
