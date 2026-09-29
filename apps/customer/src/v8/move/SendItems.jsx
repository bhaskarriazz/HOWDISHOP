import { RidePanel } from '../works/Rides';

export default function SendItems({ onReturn }) {
  return <RidePanel id="MOVE-ITEMS" title="Send Items"><p>Send Items is not available in this Preview/Test pilot yet.</p><p>HOWDI can only open this flow after a delivery service supplies item rules, service availability, a server quote, authorized driver assignment and protected sender/receiver disclosure.</p><div className="ride-alert" role="status"><b>Unavailable, not queued.</b><br />No delivery request, estimate, driver, proof of delivery, tracking, payment or settlement has been created.</div><p>Shop courier delivery is separate and cannot be used for a personal Move item request. Live maps, courier tracking, photo proof and production payments are not connected.</p><button type="button" onClick={onReturn}>Return to Ride</button></RidePanel>;
}
