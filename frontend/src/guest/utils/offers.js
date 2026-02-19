export function isDateInRange(date, startDate, endDate) {
  if (!date || !startDate || !endDate) return false;
  return date >= startDate && date <= endDate;
}

export function getActiveRoomOffer(room, referenceDate = new Date().toISOString().slice(0, 10)) {
  if (!room) return null;

  const isActive = Boolean(room.offer_active);
  const discountPercent = Number(room.offer_discount_percent);
  const hasDiscount = Number.isFinite(discountPercent) && discountPercent > 0;
  const inDateRange = isDateInRange(referenceDate, room.offer_start_date, room.offer_end_date);

  if (!isActive || !hasDiscount || !inDateRange) return null;

  return {
    title: room.offer_title || null,
    tag: room.offer_tag || null,
    badgeText: room.offer_badge_text || null,
    discountPercent,
    startDate: room.offer_start_date,
    endDate: room.offer_end_date,
  };
}

export function getDiscountedPrice(basePrice, activeOffer) {
  const originalPrice = Number(basePrice) || 0;
  if (!activeOffer || originalPrice <= 0) {
    return {
      originalPrice,
      discountedPrice: originalPrice,
      discountAmount: 0,
      hasDiscount: false,
    };
  }

  const discountAmount = (originalPrice * Number(activeOffer.discountPercent)) / 100;
  const discountedPrice = Math.max(0, originalPrice - discountAmount);

  return {
    originalPrice,
    discountedPrice: Math.round(discountedPrice * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    hasDiscount: discountAmount > 0,
  };
}

export function getOfferBadgeLabel(activeOffer) {
  if (!activeOffer) return null;
  if (activeOffer.badgeText) return activeOffer.badgeText;
  if (activeOffer.tag) return activeOffer.tag;
  return `${activeOffer.discountPercent}% OFF`;
}
