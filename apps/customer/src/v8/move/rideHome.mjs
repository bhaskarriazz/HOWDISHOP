// Customer-only views of the existing Ride DTO. Never derive places from driver offers.
export function groupCustomerRides(rows = []) {
  const groups = { current: [], completed: [], cancelled: [] };
  for (const ride of rows) {
    if (ride?.side !== 'customer') continue;
    if (['requested', 'accepted', 'in_trip'].includes(ride.state)) groups.current.push(ride);
    else if (ride.state === 'completed') groups.completed.push(ride);
    else if (['cancelled', 'expired'].includes(ride.state)) groups.cancelled.push(ride);
  }
  return groups;
}

export function recentDestinations(rows = [], limit = 4) {
  const seen = new Set();
  const places = [];
  for (const ride of groupCustomerRides(rows).completed) {
    const address = String(ride.destination || '').trim();
    const key = address.toLocaleLowerCase('en-IN');
    if (!address || seen.has(key)) continue;
    seen.add(key);
    places.push({ address, rideCode: ride.code });
    if (places.length >= limit) break;
  }
  return places;
}

export function savedAddressText(place) {
  return [place?.line1, place?.line2, place?.landmark, place?.city, place?.state]
    .map(value => String(value || '').trim()).filter(Boolean).join(', ').slice(0, 300);
}
