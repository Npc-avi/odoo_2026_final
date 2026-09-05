/**
 * Subscription Proration & Billing Math Service (Pure Logic - No DB access)
 */

/**
 * Calculates prorated charge or credit for mid-cycle quantity or plan adjustments.
 * 
 * @param {Object} params
 * @param {number} params.billingIntervalDays - Total days in standard cycle (e.g. 30 or 365)
 * @param {boolean} params.allowsProration - Whether the plan allows proration
 * @param {number} params.currentQuantity - Current active quantity
 * @param {number} params.newQuantity - Adjusted quantity
 * @param {number} params.unitRecurringPrice - Price per unit per billing cycle
 * @param {Date|string} params.cycleStartDate - Start date of the current active cycle
 * @param {Date|string} params.cycleEndDate - Next billing / cycle end date
 * @param {Date|string} [params.effectiveDate] - Date change takes effect (defaults to now)
 * @returns {{
 *   allowsProration: boolean,
 *   totalCycleDays: number,
 *   remainingDays: number,
 *   quantityDelta: number,
 *   unitRecurringPrice: number,
 *   proratedAmount: number,
 *   isCredit: boolean,
 *   prorationStart: string,
 *   prorationEnd: string,
 *   description: string
 * }}
 */
export function calculateMidCycleProration({
  billingIntervalDays = 30,
  allowsProration = true,
  currentQuantity,
  newQuantity,
  unitRecurringPrice,
  cycleStartDate,
  cycleEndDate,
  effectiveDate = new Date()
}) {
  const start = new Date(cycleStartDate);
  const end = new Date(cycleEndDate);
  const effective = new Date(effectiveDate);

  const quantityDelta = newQuantity - currentQuantity;

  if (!allowsProration || quantityDelta === 0) {
    return {
      allowsProration,
      totalCycleDays: billingIntervalDays,
      remainingDays: 0,
      quantityDelta,
      unitRecurringPrice,
      proratedAmount: 0.00,
      isCredit: false,
      prorationStart: effective.toISOString().split('T')[0],
      prorationEnd: end.toISOString().split('T')[0],
      description: `Plan updated to ${newQuantity} units (no proration applied)`
    };
  }

  // Calculate actual elapsed / remaining days
  const msPerDay = 1000 * 60 * 60 * 24;
  const cycleDaysDifference = Math.max(1, Math.round((end.getTime() - start.getTime()) / msPerDay));
  const totalCycleDays = billingIntervalDays || cycleDaysDifference;

  const remainingDaysDifference = Math.max(0, Math.round((end.getTime() - effective.getTime()) / msPerDay));
  const remainingDays = Math.min(totalCycleDays, remainingDaysDifference);

  // Daily rate per unit
  const dailyRate = Number(unitRecurringPrice) / totalCycleDays;
  const rawProrated = quantityDelta * dailyRate * remainingDays;
  const proratedAmount = Number(rawProrated.toFixed(2));
  const isCredit = proratedAmount < 0;

  const prorationStart = effective.toISOString().split('T')[0];
  const prorationEnd = end.toISOString().split('T')[0];

  const action = isCredit ? 'Credit for downgrade' : 'Prorated charge for addition';
  const description = `${action} of ${Math.abs(quantityDelta)} seat(s) (${remainingDays}/${totalCycleDays} days remaining)`;

  return {
    allowsProration,
    totalCycleDays,
    remainingDays,
    quantityDelta,
    unitRecurringPrice: Number(unitRecurringPrice),
    proratedAmount: Math.abs(proratedAmount),
    rawAmount: proratedAmount,
    isCredit,
    prorationStart,
    prorationEnd,
    description
  };
}

/**
 * Calculates cancellation refund / credit note amount for an active subscription.
 */
export function calculateCancellationCredit({
  billingIntervalDays = 30,
  allowsProration = true,
  quantity,
  unitRecurringPrice,
  cycleStartDate,
  cycleEndDate,
  effectiveDate = new Date()
}) {
  return calculateMidCycleProration({
    billingIntervalDays,
    allowsProration,
    currentQuantity: quantity,
    newQuantity: 0,
    unitRecurringPrice,
    cycleStartDate,
    cycleEndDate,
    effectiveDate
  });
}
