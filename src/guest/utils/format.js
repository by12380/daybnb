export function formatTimeRange(start, end) {
  if (!start || !end) return "";
  return `${start} - ${end}`;
}

/**
 * Format a price as currency (USD)
 * @param {number} amount - The amount to format
 * @returns {string} Formatted price string
 */
export function formatPrice(amount) {
  if (amount == null || !Number.isFinite(amount)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Calculate total price based on hours and hourly rate
 * @param {number} hours - Number of hours
 * @param {number} pricePerHour - Price per hour
 * @returns {number} Total price
 */
export function calculateTotalPrice(hours, pricePerHour) {
  if (!Number.isFinite(hours) || !Number.isFinite(pricePerHour)) return 0;
  return hours * pricePerHour;
}
