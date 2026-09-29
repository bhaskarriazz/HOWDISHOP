// Presentation helpers for the source-backed Driver Move DTO. These do not infer
// eligibility, earnings, route guidance, arrival, or suspension states.
export function driverAvailability(application) {
  if (!application) return { tone: 'alert', title: 'Driver onboarding required', detail: 'Start an Auto or Cab driver application before going online.', canToggle: false };
  if (application.state !== 'approved') return { tone: 'alert', title: `Driver ${String(application.state).replaceAll('_', ' ')}`, detail: application.reason || 'Staff approval is required before you can go online.', canToggle: false };
  if (!application.eligible_now) return { tone: 'alert', title: 'Driver unavailable', detail: 'Your vehicle, documents, zone, accessibility or pilot checks are no longer eligible. Availability is off until the server permits it.', canToggle: false };
  return application.available
    ? { tone: 'notice', title: 'Online for Ride offers', detail: `${application.vehicle_class} · ${application.zone}. The server checks eligibility again for every offer and pickup.`, canToggle: true }
    : { tone: 'notice', title: 'Offline', detail: `${application.vehicle_class} is approved and can go online in this preview pilot.`, canToggle: true };
}

export function driverOfferStatus(ride, now = Date.now()) {
  if (!ride?.offer_expires_at || Date.parse(ride.offer_expires_at) <= now) return 'expired';
  return 'active';
}

export function driverTripTitle(ride) {
  if (ride?.state === 'accepted') return 'Navigate to pickup';
  if (ride?.state === 'in_trip') return 'Trip active';
  if (ride?.state === 'completed') return 'Trip completed';
  if (ride?.state === 'cancelled') return 'Ride cancelled';
  return 'Ride status';
}
