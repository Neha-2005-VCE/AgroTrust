// Calculation logic for dynamic profit distribution
function calculateProfitDistribution({
  actual_yield,
  expected_yield,
  market_price,
  base_price,
  total_profit,
  base_share = 40, // percent
  max_investor_share = 60 // percent
}) {
  let yield_ratio = 0;
  let price_ratio = 0;
  let investor_share_percent = 0;

  if (expected_yield > 0) {
    yield_ratio = actual_yield / expected_yield;
  }
  if (base_price > 0) {
    price_ratio = market_price / base_price;
  }

  // Edge case: zero yield
  if (actual_yield === 0) {
    investor_share_percent = 0;
  } else {
    investor_share_percent = base_share * yield_ratio * price_ratio;
    if (investor_share_percent > max_investor_share) {
      investor_share_percent = max_investor_share;
    }
    if (investor_share_percent < 0) {
      investor_share_percent = 0;
    }
  }
  const farmer_share_percent = 100 - investor_share_percent;
  const investor_share_amount = total_profit * (investor_share_percent / 100);
  const farmer_share_amount = total_profit * (farmer_share_percent / 100);

  return {
    yield_ratio,
    price_ratio,
    investor_share_percent,
    farmer_share_percent,
    investor_share_amount,
    farmer_share_amount
  };
}

module.exports = { calculateProfitDistribution };