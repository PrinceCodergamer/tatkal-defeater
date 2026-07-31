/**
 * Train asset registry — maps each of the 45 transparent components to its
 * storytelling metadata (label, spec, engineering blurb). Used by the
 * /experience cinematic route.
 */

export interface TrainComponent {
  id: string;
  asset: string;
  name: string;
  category: 'body' | 'roof' | 'bogie' | 'interior' | 'systems' | 'misc';
  spec: string;
  blurb: string;
}

export const TRAIN_COMPONENTS: TrainComponent[] = [
  { id: 'driver-cabin', asset: '03-driver-cabin.png', name: 'Driver Cabin', category: 'body', spec: 'ISO 3381 · <55 dB', blurb: 'Human-centered command center with panoramic sightlines and redundant safety systems.' },
  { id: 'nose-cone', asset: '04-nose-cone.png', name: 'Nose Cone', category: 'body', spec: 'Drag coeff 0.18 Cd', blurb: 'Aerodynamically sculpted to slip through the air at 250+ km/h with near-silent acoustics.' },
  { id: 'windshield', asset: '05-windshield.png', name: 'Windshield', category: 'body', spec: 'Laminated · UV-filtered', blurb: 'HUD-projected, thermally tempered glass engineered for high-speed clarity and safety.' },
  { id: 'driver-console', asset: '06-driver-console.png', name: 'Driver Console', category: 'body', spec: '3 redundant displays', blurb: 'Triple-redundant controls with predictive braking telemetry at the operator\'s fingertips.' },
  { id: 'passenger-coach', asset: '07-passenger-coach-exterior.png', name: 'Passenger Coach', category: 'body', spec: 'AL-6082 alloy shell', blurb: 'Lightweight extruded aluminium monocoque — strong, safe, and corrosion-resistant.' },
  { id: 'coach-interior', asset: '08-passenger-coach-interior.png', name: 'Coach Interior', category: 'interior', spec: '2+2 config · 3.2m wide', blurb: 'Wide-body aisle, ambient lighting, and climate zones tuned for long-haul comfort.' },
  { id: 'seats', asset: '09-passenger-seats.png', name: 'Passenger Seats', category: 'interior', spec: 'Eco-leather · recline 38°', blurb: 'Ergonomic, reclining seats with integrated USB-C and personal reading lights.' },
  { id: 'doors', asset: '10-doors.png', name: 'Automatic Doors', category: 'body', spec: '1400mm · 0.9s open', blurb: 'Plug-style doors that seal against pressure changes and open in under a second.' },
  { id: 'windows', asset: '11-windows.png', name: 'Panoramic Windows', category: 'body', spec: 'Double-glazed · UV 99%', blurb: 'Oversized, thermally insulating windows that frame the journey without glare.' },
  { id: 'roof-equipment', asset: '12-roof-equipment.png', name: 'Roof Equipment', category: 'roof', spec: '25kV isolated', blurb: 'High-voltage roof architecture — pantograph, insulators, and busbars in a sealed corridor.' },
  { id: 'pantograph', asset: '13-pantograph.png', name: 'Pantograph', category: 'roof', spec: '25kV AC · 1,000A', blurb: 'Active-carbon-strip collector that rides the overhead wire at full speed without sparking.' },
  { id: 'hvac', asset: '14-hvac-unit.png', name: 'HVAC Unit', category: 'roof', spec: '48 kW · dual loop', blurb: 'Pressurised climate control with HEPA filtration — 26°C in any weather.' },
  { id: 'electrical-cabinet', asset: '15-electrical-cabinet.png', name: 'Electrical Cabinet', category: 'roof', spec: 'IP65 · redundant bus', blurb: 'Sealed high-voltage distribution that routes 25kV safely into every coach.' },
  { id: 'insulators', asset: '16-insulators.png', name: 'Insulators', category: 'roof', spec: 'Silicone · 1,400mm creep', blurb: 'Pollution-grade silicone insulators that isolate 25,000 volts from the chassis.' },
  { id: 'battery', asset: '17-battery-pack.png', name: 'Battery Pack', category: 'systems', spec: '1.2 MWh · NMC cells', blurb: 'High-density traction battery enabling silent, zero-emission station approach and backup.' },
  { id: 'traction-motor', asset: '18-traction-motor.png', name: 'Traction Motor', category: 'systems', spec: '8× 1,200 kW PMSM', blurb: 'Permanent-magnet synchronous motors — 96% efficiency, instant torque, silent run.' },
  { id: 'converter', asset: '19-auxiliary-converter.png', name: 'Auxiliary Converter', category: 'systems', spec: 'SiC IGBT · 99% eff', blurb: 'Silicon-carbide power electronics that convert traction current into clean auxiliaries.' },
  { id: 'transformer', asset: '20-transformer.png', name: 'Transformer', category: 'systems', spec: '25kV → 1.9kV · 8.2 MVA', blurb: 'The heart of the power train — steps down overhead current for motors and systems.' },
  { id: 'underframe', asset: '21-underframe.png', name: 'Underframe', category: 'body', spec: 'Stress-relieved steel', blurb: 'The structural backbone that absorbs collision energy and carries every system.' },
  { id: 'bogie', asset: '22-bogie-front.png', name: 'Bogie', category: 'bogie', spec: 'Air-spring · 120 t load', blurb: 'Self-steering bogies with active air suspension for a glass-smooth ride at speed.' },
  { id: 'wheelset', asset: '24-wheelset.png', name: 'Wheelset', category: 'bogie', spec: '920mm · monoblock', blurb: 'Heat-treated monoblock wheels with condition-monitoring for every revolution.' },
  { id: 'suspension', asset: '25-suspension.png', name: 'Suspension', category: 'bogie', spec: 'Active dampers · 2-stage', blurb: 'Two-stage air suspension that isolates the cabin from every track irregularity.' },
  { id: 'brakes', asset: '26-brake-system.png', name: 'Brake System', category: 'bogie', spec: 'ED + disc + parking', blurb: 'Triple-redundant braking — electric, pneumatic disc, and fail-safe parking.' },
  { id: 'coupler', asset: '27-coupler.png', name: 'Coupler', category: 'misc', spec: 'Auto · 1,500 kN', blurb: 'Automatic couplers that join coaches with millimetre precision and full train-line connection.' },
  { id: 'body-shell', asset: '28-body-shell.png', name: 'Body Shell', category: 'body', spec: 'Friction-stir welded', blurb: 'One-piece welded shell that keeps the whole train stiff, light, and safe.' },
  { id: 'chassis', asset: '29-chassis.png', name: 'Chassis', category: 'body', spec: 'Galvanised steel', blurb: 'Rust-proofed structural chassis that carries propulsion and passenger payloads.' },
  { id: 'cable-harness', asset: '30-cable-harness.png', name: 'Cable Harness', category: 'systems', spec: '28 km of cabling', blurb: 'A nervous system of 28 km of shielded cable carrying data and power everywhere.' },
  { id: 'lighting', asset: '33-lighting-system.png', name: 'Lighting System', category: 'interior', spec: 'Full LED · 3,000K–5,000K', blurb: 'Tunable ambient LED lighting that follows circadian rhythm across the journey.' },
  { id: 'info-display', asset: '35-passenger-information-display.png', name: 'Information Display', category: 'interior', spec: '4K · PIS network', blurb: 'Real-time journey, delay, and wayfinding information at every seat and door.' },
];

export const COMPLETE_TRAIN = '01-complete-train.png';
export const EXPLODED_TRAIN = '02-exploded-train.png';

export const FEATURE_COMPONENTS = [
  '13-pantograph.png',
  '14-hvac-unit.png',
  '17-battery-pack.png',
  '18-traction-motor.png',
  '20-transformer.png',
  '24-wheelset.png',
  '27-coupler.png',
];
