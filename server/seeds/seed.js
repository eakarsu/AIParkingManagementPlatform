require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  try {
    // Clear existing data
    await pool.query('TRUNCATE users, facilities, occupancy_records, pricing_rules, plate_records, violations, revenue_records, payments, sensors, ev_stations, reservations, permits, analytics_reports, security_cameras, maintenance_tasks, customer_feedback, parking_zones RESTART IDENTITY CASCADE');
    console.log('🗑️  Cleared existing data');

    // Seed Users
    const passwordHash = await bcrypt.hash('admin123', 10);
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES
       ('Admin User', 'admin@parking.com', $1, 'admin'),
       ('John Operator', 'john@parking.com', $1, 'operator'),
       ('Sarah Manager', 'sarah@parking.com', $1, 'manager')`,
      [passwordHash]
    );
    console.log('✅ Seeded 3 users (password: admin123)');

    // Seed 15 Facilities
    await pool.query(`
      INSERT INTO facilities (name, address, total_spaces, hourly_rate, facility_type, status, latitude, longitude) VALUES
      ('Downtown Central Garage', '100 Main St, Downtown', 850, 8.50, 'garage', 'active', 34.0522, -118.2437),
      ('Airport Long-Term Lot', '1 Airport Blvd, Terminal 1', 2000, 12.00, 'lot', 'active', 33.9425, -118.4081),
      ('Mall Parking Complex', '500 Shopping Ave, Westside', 1200, 4.00, 'garage', 'active', 34.0195, -118.4912),
      ('University Campus Deck', '200 College Dr, Campus', 600, 3.50, 'deck', 'active', 34.0689, -118.4452),
      ('Hospital Visitor Lot', '300 Medical Center Way', 400, 6.00, 'lot', 'active', 34.0736, -118.3786),
      ('Convention Center Garage', '800 Convention Blvd', 1500, 10.00, 'garage', 'active', 34.0407, -118.2688),
      ('Beachfront Parking', '1 Ocean Walk, Beach City', 300, 7.50, 'lot', 'active', 33.9850, -118.4695),
      ('Financial District Tower', '450 Wall St, Financial District', 500, 15.00, 'garage', 'active', 34.0560, -118.2508),
      ('Sports Arena Lot', '1000 Stadium Way', 3000, 20.00, 'lot', 'active', 34.0141, -118.2879),
      ('Tech Park Campus', '600 Innovation Dr, Tech Valley', 750, 5.00, 'deck', 'active', 34.0259, -118.3962),
      ('Historic District Garage', '150 Heritage Lane', 350, 6.50, 'garage', 'active', 34.0580, -118.2404),
      ('Residential Complex Lot', '275 Sunset Blvd', 200, 3.00, 'lot', 'active', 34.0928, -118.3287),
      ('Transit Hub Parking', '50 Metro Station Rd', 900, 4.50, 'deck', 'active', 34.0561, -118.2346),
      ('Entertainment District', '700 Hollywood Blvd', 650, 11.00, 'garage', 'active', 34.1017, -118.3263),
      ('Suburban Shopping Center', '1200 Valley View Dr', 1100, 2.50, 'lot', 'active', 34.1478, -118.3946)
    `);
    console.log('✅ Seeded 15 facilities');

    // Seed 15+ Occupancy Records
    await pool.query(`
      INSERT INTO occupancy_records (facility_id, occupied_spaces, total_spaces, occupancy_rate, prediction_confidence, predicted_occupancy, notes) VALUES
      (1, 720, 850, 84.7, 92.5, 88.0, 'Morning rush hour peak'),
      (2, 1650, 2000, 82.5, 88.0, 85.0, 'Holiday travel surge'),
      (3, 960, 1200, 80.0, 90.0, 82.0, 'Weekend shopping peak'),
      (4, 540, 600, 90.0, 95.0, 92.0, 'Class session in progress'),
      (5, 380, 400, 95.0, 91.0, 93.0, 'Visiting hours peak'),
      (6, 1200, 1500, 80.0, 87.0, 83.0, 'Conference day'),
      (7, 285, 300, 95.0, 93.0, 96.0, 'Summer beach weekend'),
      (8, 475, 500, 95.0, 96.0, 94.0, 'Business hours peak'),
      (9, 450, 3000, 15.0, 85.0, 20.0, 'No event scheduled'),
      (10, 600, 750, 80.0, 89.0, 82.0, 'Tech company workday'),
      (11, 280, 350, 80.0, 88.0, 82.0, 'Tourist season'),
      (12, 150, 200, 75.0, 86.0, 78.0, 'Evening residential'),
      (13, 810, 900, 90.0, 94.0, 91.0, 'Morning commuter rush'),
      (14, 585, 650, 90.0, 91.0, 88.0, 'Evening show time'),
      (15, 550, 1100, 50.0, 82.0, 55.0, 'Weekday afternoon'),
      (1, 510, 850, 60.0, 90.0, 65.0, 'Late evening decline'),
      (2, 1800, 2000, 90.0, 93.0, 91.0, 'Peak travel day'),
      (3, 360, 1200, 30.0, 85.0, 35.0, 'Early morning low')
    `);
    console.log('✅ Seeded 18 occupancy records');

    // Seed 15+ Pricing Rules
    await pool.query(`
      INSERT INTO pricing_rules (facility_id, rule_name, base_rate, peak_multiplier, off_peak_multiplier, surge_threshold, time_start, time_end, day_type, status) VALUES
      (1, 'Downtown Weekday Peak', 8.50, 2.0, 0.7, 85, '07:00', '19:00', 'weekday', 'active'),
      (1, 'Downtown Weekend', 8.50, 1.5, 0.6, 90, '10:00', '22:00', 'weekend', 'active'),
      (2, 'Airport Standard', 12.00, 1.8, 0.9, 80, '05:00', '23:00', 'all', 'active'),
      (3, 'Mall Holiday Surge', 4.00, 2.5, 0.5, 75, '10:00', '21:00', 'holiday', 'active'),
      (4, 'University Semester', 3.50, 1.3, 0.8, 90, '07:00', '22:00', 'weekday', 'active'),
      (5, 'Hospital Emergency', 6.00, 1.0, 1.0, 95, '00:00', '23:59', 'all', 'active'),
      (6, 'Convention Event Day', 10.00, 3.0, 0.6, 70, '08:00', '20:00', 'event', 'active'),
      (7, 'Beach Summer Peak', 7.50, 2.5, 0.5, 80, '09:00', '19:00', 'weekend', 'active'),
      (8, 'Financial Early Bird', 15.00, 1.2, 0.7, 90, '06:00', '10:00', 'weekday', 'active'),
      (9, 'Arena Game Day', 20.00, 3.0, 0.4, 60, '15:00', '23:00', 'event', 'active'),
      (10, 'Tech Park Flexible', 5.00, 1.4, 0.8, 85, '08:00', '18:00', 'weekday', 'active'),
      (11, 'Historic Night Rate', 6.50, 1.0, 0.5, 70, '18:00', '06:00', 'all', 'active'),
      (12, 'Residential Monthly', 3.00, 1.0, 1.0, 95, '00:00', '23:59', 'all', 'active'),
      (13, 'Transit Commuter', 4.50, 1.6, 0.7, 85, '06:00', '10:00', 'weekday', 'active'),
      (14, 'Entertainment Premium', 11.00, 2.8, 0.5, 75, '17:00', '02:00', 'weekend', 'active'),
      (15, 'Suburban Value', 2.50, 1.3, 0.9, 80, '09:00', '21:00', 'all', 'active')
    `);
    console.log('✅ Seeded 16 pricing rules');

    // Seed 15+ Plate Records
    await pool.query(`
      INSERT INTO plate_records (facility_id, plate_number, state, vehicle_type, entry_exit, confidence, camera_id, notes) VALUES
      (1, 'ABC-1234', 'CA', 'sedan', 'entry', 98.5, 'CAM-01', 'Regular commuter'),
      (1, 'XYZ-5678', 'CA', 'suv', 'entry', 96.2, 'CAM-01', 'First time visitor'),
      (2, 'FLY-9012', 'NY', 'sedan', 'entry', 99.1, 'CAM-03', 'Airport pickup'),
      (3, 'SHP-3456', 'CA', 'minivan', 'entry', 94.8, 'CAM-02', 'Weekend shopper'),
      (4, 'UNI-7890', 'CA', 'compact', 'entry', 97.3, 'CAM-01', 'Student parking'),
      (5, 'MED-2345', 'CA', 'sedan', 'entry', 95.6, 'CAM-04', 'Hospital visitor'),
      (6, 'CNV-6789', 'TX', 'suv', 'entry', 93.4, 'CAM-02', 'Conference attendee'),
      (7, 'BCH-0123', 'CA', 'truck', 'exit', 97.8, 'CAM-01', 'Beach visitor leaving'),
      (8, 'FIN-4567', 'CA', 'luxury', 'entry', 99.5, 'CAM-03', 'Executive parking'),
      (9, 'SPT-8901', 'CA', 'suv', 'entry', 96.0, 'CAM-05', 'Game day attendee'),
      (10, 'TCH-2345', 'WA', 'electric', 'entry', 98.2, 'CAM-01', 'EV parking'),
      (11, 'HST-6789', 'CA', 'sedan', 'exit', 95.1, 'CAM-02', 'Tourist departure'),
      (12, 'RES-0123', 'CA', 'compact', 'entry', 99.0, 'CAM-01', 'Resident'),
      (13, 'TRN-4567', 'CA', 'sedan', 'entry', 97.7, 'CAM-03', 'Transit commuter'),
      (14, 'ENT-8901', 'NV', 'luxury', 'entry', 94.5, 'CAM-02', 'Show attendee'),
      (15, 'SUB-2345', 'CA', 'minivan', 'entry', 96.8, 'CAM-01', 'Family shopping'),
      (1, 'ABC-1234', 'CA', 'sedan', 'exit', 98.8, 'CAM-02', 'Regular commuter leaving'),
      (2, 'JET-5555', 'FL', 'sedan', 'entry', 92.3, 'CAM-01', 'Long-term parking')
    `);
    console.log('✅ Seeded 18 plate records');

    // Seed 15+ Violations
    await pool.query(`
      INSERT INTO violations (facility_id, plate_number, violation_type, fine_amount, description, status, zone, evidence_url) VALUES
      (1, 'VIO-1111', 'expired_meter', 75.00, 'Meter expired by 45 minutes', 'pending', 'A1', ''),
      (1, 'VIO-2222', 'no_permit', 150.00, 'Parked in permit-only zone without valid permit', 'pending', 'B2', ''),
      (2, 'VIO-3333', 'double_parking', 200.00, 'Blocking adjacent parking space', 'issued', 'C1', ''),
      (3, 'VIO-4444', 'handicap_violation', 500.00, 'Parked in handicap zone without placard', 'pending', 'A3', ''),
      (4, 'VIO-5555', 'fire_lane', 300.00, 'Parked in fire lane', 'paid', 'D1', ''),
      (5, 'VIO-6666', 'overtime_parking', 50.00, 'Exceeded 2-hour limit by 30 minutes', 'pending', 'B1', ''),
      (6, 'VIO-7777', 'no_permit', 150.00, 'Event parking without valid pass', 'disputed', 'A2', ''),
      (7, 'VIO-8888', 'expired_meter', 75.00, 'Meter expired by 2 hours', 'issued', 'C2', ''),
      (8, 'VIO-9999', 'unauthorized_area', 250.00, 'Parked in reserved executive space', 'pending', 'E1', ''),
      (9, 'VIO-1010', 'tailgating', 100.00, 'Tailgated into facility without ticket', 'pending', 'A1', ''),
      (10, 'VIO-1112', 'ev_charging_abuse', 75.00, 'Non-EV parked at charging station', 'issued', 'F1', ''),
      (11, 'VIO-1213', 'expired_meter', 75.00, 'Historic district meter violation', 'pending', 'B3', ''),
      (12, 'VIO-1314', 'noise_violation', 50.00, 'Excessive horn usage in quiet zone', 'dismissed', 'A1', ''),
      (13, 'VIO-1415', 'wrong_direction', 100.00, 'Driving wrong way in one-way aisle', 'pending', 'C3', ''),
      (14, 'VIO-1516', 'no_payment', 125.00, 'Left facility without payment', 'issued', 'A1', ''),
      (15, 'VIO-1617', 'overtime_parking', 50.00, 'Exceeded 4-hour limit', 'pending', 'D2', ''),
      (1, 'ABC-1234', 'expired_meter', 75.00, 'Regular commuter meter lapse', 'paid', 'A1', '')
    `);
    console.log('✅ Seeded 17 violations');

    // Seed 15+ Revenue Records
    const dates = [];
    for (let i = 0; i < 18; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const revenueValues = [
      [1, dates[0], 12500, 9800, 1200, 1500, 245, 3.2, 87.5],
      [2, dates[0], 28000, 24000, 800, 3200, 580, 8.5, 91.2],
      [3, dates[0], 8500, 6500, 500, 1500, 320, 2.1, 78.3],
      [4, dates[1], 4200, 3200, 200, 800, 180, 4.5, 82.1],
      [5, dates[1], 5800, 4800, 300, 700, 150, 2.8, 85.6],
      [6, dates[1], 18500, 15000, 1500, 2000, 420, 3.8, 89.4],
      [7, dates[2], 6200, 5500, 200, 500, 210, 4.2, 83.7],
      [8, dates[2], 15800, 14000, 600, 1200, 180, 6.5, 93.2],
      [9, dates[2], 45000, 42000, 1000, 2000, 890, 3.5, 95.0],
      [10, dates[3], 7500, 6000, 500, 1000, 280, 5.2, 81.4],
      [11, dates[3], 4800, 3800, 400, 600, 160, 3.1, 76.8],
      [12, dates[3], 1800, 1500, 100, 200, 95, 8.2, 72.5],
      [13, dates[4], 9200, 7500, 700, 1000, 350, 3.8, 86.3],
      [14, dates[4], 14500, 12000, 1000, 1500, 310, 3.2, 88.9],
      [15, dates[4], 5500, 4200, 300, 1000, 410, 1.8, 74.2],
      [1, dates[5], 11800, 9200, 1100, 1500, 230, 3.4, 86.1],
      [2, dates[5], 26500, 22000, 1500, 3000, 550, 7.8, 90.5],
      [3, dates[5], 9200, 7200, 600, 1400, 345, 2.3, 79.8]
    ];

    for (const v of revenueValues) {
      await pool.query(
        `INSERT INTO revenue_records (facility_id, record_date, total_revenue, parking_revenue, violation_revenue, subscription_revenue, transactions_count, avg_duration_hours, optimization_score)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        v
      );
    }
    console.log('✅ Seeded 18 revenue records');

    // Seed 15+ Payments
    await pool.query(`
      INSERT INTO payments (facility_id, plate_number, amount, payment_method, payment_status, duration_hours, phone_number, transaction_ref, notes) VALUES
      (1, 'ABC-1234', 25.50, 'mobile', 'completed', 3.0, '555-0101', 'TXN-100001', 'Apple Pay'),
      (1, 'XYZ-5678', 17.00, 'credit_card', 'completed', 2.0, '', 'TXN-100002', 'Visa ending 4242'),
      (2, 'FLY-9012', 96.00, 'mobile', 'completed', 8.0, '555-0203', 'TXN-100003', 'Google Pay'),
      (3, 'SHP-3456', 12.00, 'cash', 'completed', 3.0, '', 'TXN-100004', 'Cash at kiosk'),
      (4, 'UNI-7890', 7.00, 'mobile', 'completed', 2.0, '555-0405', 'TXN-100005', 'Student discount applied'),
      (5, 'MED-2345', 18.00, 'credit_card', 'completed', 3.0, '', 'TXN-100006', 'Mastercard ending 5555'),
      (6, 'CNV-6789', 40.00, 'mobile', 'completed', 4.0, '555-0607', 'TXN-100007', 'Event rate applied'),
      (7, 'BCH-0123', 30.00, 'mobile', 'completed', 4.0, '555-0809', 'TXN-100008', 'Samsung Pay'),
      (8, 'FIN-4567', 120.00, 'credit_card', 'completed', 8.0, '', 'TXN-100009', 'Amex Corporate'),
      (9, 'SPT-8901', 40.00, 'mobile', 'completed', 4.0, '555-1011', 'TXN-100010', 'Pre-paid event parking'),
      (10, 'TCH-2345', 25.00, 'mobile', 'completed', 5.0, '555-1213', 'TXN-100011', 'EV charging included'),
      (11, 'HST-6789', 19.50, 'cash', 'completed', 3.0, '', 'TXN-100012', 'Cash payment'),
      (12, 'RES-0123', 90.00, 'mobile', 'completed', 720.0, '555-1415', 'TXN-100013', 'Monthly resident pass'),
      (13, 'TRN-4567', 9.00, 'mobile', 'completed', 2.0, '555-1617', 'TXN-100014', 'Commuter rate'),
      (14, 'ENT-8901', 44.00, 'credit_card', 'completed', 4.0, '', 'TXN-100015', 'Evening show rate'),
      (15, 'SUB-2345', 5.00, 'mobile', 'completed', 2.0, '555-1819', 'TXN-100016', 'Value parking'),
      (1, 'NEW-9999', 8.50, 'mobile', 'pending', 1.0, '555-2021', 'TXN-100017', 'Payment processing'),
      (2, 'ERR-1111', 24.00, 'credit_card', 'failed', 2.0, '', 'TXN-100018', 'Card declined')
    `);
    console.log('✅ Seeded 18 payments');

    // Seed Sensors
    await pool.query(`
      INSERT INTO sensors (facility_id, sensor_name, sensor_type, location_zone, status, battery_level, last_reading) VALUES
      (1, 'OCC-A1-001', 'occupancy', 'A1', 'online', 95, NOW() - INTERVAL '5 minutes'),
      (1, 'OCC-A1-002', 'occupancy', 'A1', 'online', 88, NOW() - INTERVAL '3 minutes'),
      (1, 'ENTRY-MAIN', 'entry_exit', 'Main Gate', 'online', 100, NOW() - INTERVAL '1 minute'),
      (2, 'OCC-B1-001', 'occupancy', 'B1', 'online', 72, NOW() - INTERVAL '10 minutes'),
      (2, 'ENV-B1-001', 'environmental', 'B1', 'online', 65, NOW() - INTERVAL '15 minutes'),
      (3, 'ENTRY-NORTH', 'entry_exit', 'North Gate', 'online', 100, NOW() - INTERVAL '2 minutes'),
      (3, 'TRAFFIC-L1', 'traffic', 'Level 1', 'maintenance', 45, NOW() - INTERVAL '2 hours'),
      (4, 'OCC-C1-001', 'occupancy', 'C1', 'online', 91, NOW() - INTERVAL '4 minutes'),
      (5, 'ENV-VISITOR', 'environmental', 'Visitor Lot', 'online', 78, NOW() - INTERVAL '8 minutes'),
      (6, 'ENTRY-SOUTH', 'entry_exit', 'South Gate', 'offline', 12, NOW() - INTERVAL '6 hours'),
      (7, 'OCC-BEACH-01', 'occupancy', 'Beach Row A', 'online', 83, NOW() - INTERVAL '7 minutes'),
      (8, 'TRAFFIC-FIN', 'traffic', 'Level 2', 'online', 100, NOW() - INTERVAL '1 minute'),
      (9, 'ENTRY-WEST', 'entry_exit', 'West Gate', 'online', 100, NOW() - INTERVAL '30 seconds'),
      (10, 'ENV-TECH-01', 'environmental', 'Main Deck', 'online', 56, NOW() - INTERVAL '12 minutes'),
      (11, 'OCC-HST-001', 'occupancy', 'Heritage Zone', 'maintenance', 30, NOW() - INTERVAL '1 day'),
      (12, 'OCC-RES-001', 'occupancy', 'Resident Lot', 'online', 89, NOW() - INTERVAL '6 minutes'),
      (13, 'TRAFFIC-HUB', 'traffic', 'Transit Level 1', 'online', 100, NOW() - INTERVAL '2 minutes'),
      (14, 'ENTRY-HOLLY', 'entry_exit', 'Main Entrance', 'online', 100, NOW() - INTERVAL '45 seconds'),
      (15, 'OCC-SUB-001', 'occupancy', 'Section A', 'online', 77, NOW() - INTERVAL '9 minutes')
    `);
    console.log('✅ Seeded 19 sensors');

    // Seed EV Stations
    await pool.query(`
      INSERT INTO ev_stations (facility_id, station_name, connector_type, power_kw, status, current_vehicle_plate, energy_delivered_kwh, rate_per_kwh, notes) VALUES
      (1, 'EV-DT-01', 'Type2', 22, 'in_use', 'EV-1234', 18.5, 0.35, 'Level 2 AC charger'),
      (1, 'EV-DT-02', 'CCS', 150, 'available', NULL, 0, 0.45, 'DC fast charger'),
      (2, 'EV-AIR-01', 'Tesla', 250, 'in_use', 'TSL-5678', 42.3, 0.40, 'Tesla Supercharger'),
      (2, 'EV-AIR-02', 'CHAdeMO', 50, 'out_of_service', NULL, 0, 0.40, 'Awaiting connector replacement'),
      (3, 'EV-MALL-01', 'Type2', 22, 'available', NULL, 0, 0.30, 'Free with validation'),
      (3, 'EV-MALL-02', 'Type1', 7.4, 'in_use', 'PHV-9012', 5.2, 0.25, 'Level 1 slow charge'),
      (4, 'EV-UNI-01', 'Type2', 22, 'reserved', NULL, 0, 0.20, 'Faculty reserved 2-4pm'),
      (5, 'EV-HOSP-01', 'CCS', 100, 'available', NULL, 0, 0.38, 'Emergency vehicle priority'),
      (6, 'EV-CONV-01', 'Tesla', 150, 'in_use', 'TSL-3344', 35.7, 0.42, 'Tesla destination charger'),
      (6, 'EV-CONV-02', 'CCS', 350, 'available', NULL, 0, 0.50, 'Ultra-fast DC charger'),
      (8, 'EV-FIN-01', 'Type2', 22, 'in_use', 'EXC-7788', 12.1, 0.35, 'Executive level charger'),
      (10, 'EV-TECH-01', 'CCS', 150, 'available', NULL, 0, 0.30, 'Employee benefit - discounted'),
      (10, 'EV-TECH-02', 'Type2', 22, 'in_use', 'TCH-5566', 8.9, 0.30, 'Campus south charger'),
      (13, 'EV-TRAN-01', 'CHAdeMO', 50, 'available', NULL, 0, 0.35, 'Transit hub fast charge'),
      (14, 'EV-ENT-01', 'Tesla', 150, 'in_use', 'TSL-9900', 28.4, 0.45, 'Premium valet charging'),
      (15, 'EV-SUB-01', 'Type1', 7.4, 'available', NULL, 0, 0.22, 'Suburban economy charger')
    `);
    console.log('✅ Seeded 16 EV stations');

    // Seed Reservations
    await pool.query(`
      INSERT INTO reservations (facility_id, customer_name, customer_email, customer_phone, plate_number, spot_number, start_time, end_time, status, total_amount, payment_method, notes) VALUES
      (1, 'Michael Chen', 'mchen@email.com', '555-2001', 'MCH-1001', 'A-101', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '4 hours', 'confirmed', 25.50, 'credit_card', 'Downtown meeting'),
      (1, 'Lisa Park', 'lpark@email.com', '555-2002', 'LPK-2002', 'A-205', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '2 hours', 'active', 25.50, 'mobile', 'Regular customer'),
      (2, 'James Wilson', 'jwilson@email.com', '555-2003', 'JWL-3003', 'T1-045', NOW() + INTERVAL '2 days', NOW() + INTERVAL '9 days', 'confirmed', 504.00, 'credit_card', 'Business trip - 7 days'),
      (2, 'Maria Garcia', 'mgarcia@email.com', '555-2004', 'MGA-4004', 'T2-112', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day', 'completed', 144.00, 'mobile', 'Vacation return'),
      (3, 'Robert Kim', 'rkim@email.com', '555-2005', 'RKM-5005', 'M-301', NOW() + INTERVAL '3 hours', NOW() + INTERVAL '6 hours', 'confirmed', 12.00, 'mobile', 'Shopping trip'),
      (4, 'Emily Zhang', 'ezhang@email.com', '555-2006', 'EZH-6006', 'U-044', NOW(), NOW() + INTERVAL '5 hours', 'active', 17.50, 'mobile', 'Exam day parking'),
      (5, 'David Thompson', 'dthompson@email.com', '555-2007', 'DTH-7007', 'V-015', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 3 hours', 'confirmed', 18.00, 'credit_card', 'Doctor appointment'),
      (6, 'Sarah Johnson', 'sjohnson@email.com', '555-2008', 'SJH-8008', 'C-220', NOW() + INTERVAL '5 hours', NOW() + INTERVAL '10 hours', 'confirmed', 50.00, 'credit_card', 'Tech conference'),
      (7, 'Kevin Brown', 'kbrown@email.com', '555-2009', 'KBR-9009', 'B-005', NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days 6 hours', 'confirmed', 45.00, 'mobile', 'Beach weekend'),
      (8, 'Amanda White', 'awhite@email.com', '555-2010', 'AWH-1010', 'F-401', NOW() - INTERVAL '2 hours', NOW() + INTERVAL '6 hours', 'active', 120.00, 'credit_card', 'Full day executive'),
      (9, 'Carlos Rodriguez', 'crodriguez@email.com', '555-2011', 'CRD-1111', 'S-088', NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days 5 hours', 'confirmed', 100.00, 'mobile', 'Concert parking'),
      (10, 'Jennifer Lee', 'jlee@email.com', '555-2012', 'JLE-1212', 'T-055', NOW() - INTERVAL '30 minutes', NOW() + INTERVAL '8 hours', 'active', 42.50, 'mobile', 'Full workday'),
      (11, 'Thomas Anderson', 'tanderson@email.com', '555-2013', 'TAN-1313', 'H-012', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 4 hours', 'confirmed', 26.00, 'credit_card', 'Museum visit'),
      (13, 'Rachel Green', 'rgreen@email.com', '555-2014', 'RGR-1414', 'P-078', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days 2 hours', 'completed', 9.00, 'mobile', 'Quick errand'),
      (14, 'Brian Taylor', 'btaylor@email.com', '555-2015', 'BTY-1515', 'E-199', NOW() + INTERVAL '6 hours', NOW() + INTERVAL '10 hours', 'confirmed', 44.00, 'credit_card', 'Evening show'),
      (5, 'Nancy Drew', 'ndrew@email.com', '555-2016', 'NDR-1616', 'V-022', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', 'no_show', 18.00, 'credit_card', 'No show - appointment cancelled'),
      (3, 'Paul Martinez', 'pmartinez@email.com', '555-2017', 'PMR-1717', 'M-150', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '4 hours', 'cancelled', 12.00, 'mobile', 'Customer cancelled')
    `);
    console.log('✅ Seeded 17 reservations');

    // Seed Permits
    await pool.query(`
      INSERT INTO permits (facility_id, permit_number, holder_name, holder_email, plate_number, permit_type, start_date, end_date, monthly_rate, status, zone_access, notes) VALUES
      (1, 'PRM-DT-001', 'Alice Morgan', 'amorgan@corp.com', 'AMG-0001', 'monthly', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '15 days', 250.00, 'active', 'A,B', 'Downtown office worker'),
      (1, 'PRM-DT-002', 'Bob Harris', 'bharris@corp.com', 'BHR-0002', 'annual', CURRENT_DATE - INTERVAL '6 months', CURRENT_DATE + INTERVAL '6 months', 200.00, 'active', 'A,B,C', 'Senior executive annual pass'),
      (2, 'PRM-AIR-001', 'Carol Diaz', 'cdiaz@airline.com', 'CDZ-0003', 'employee', CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE + INTERVAL '9 months', 75.00, 'active', 'Employee Lot', 'Airline staff parking'),
      (2, 'PRM-AIR-002', 'Dan Foster', 'dfoster@tsa.gov', 'DFS-0004', 'employee', CURRENT_DATE - INTERVAL '1 month', CURRENT_DATE + INTERVAL '11 months', 75.00, 'active', 'Employee Lot', 'TSA employee'),
      (4, 'PRM-UNI-001', 'Eva Nguyen', 'enguyen@univ.edu', 'ENG-0005', 'student', CURRENT_DATE - INTERVAL '2 months', CURRENT_DATE + INTERVAL '4 months', 45.00, 'active', 'Student Zone', 'Graduate student'),
      (4, 'PRM-UNI-002', 'Frank Patel', 'fpatel@univ.edu', 'FPT-0006', 'student', CURRENT_DATE - INTERVAL '2 months', CURRENT_DATE + INTERVAL '4 months', 45.00, 'active', 'Student Zone', 'Undergraduate senior'),
      (4, 'PRM-UNI-003', 'Grace Liu', 'gliu@univ.edu', 'GLU-0007', 'employee', CURRENT_DATE - INTERVAL '5 months', CURRENT_DATE + INTERVAL '7 months', 80.00, 'active', 'Faculty Zone', 'Associate professor'),
      (6, 'PRM-CNV-001', 'VIP Services Inc', 'vip@events.com', 'VIP-0008', 'vip', CURRENT_DATE, CURRENT_DATE + INTERVAL '3 days', 500.00, 'active', 'VIP,Premium', 'Convention VIP block'),
      (8, 'PRM-FIN-001', 'Henry Clark', 'hclark@finance.com', 'HCK-0009', 'monthly', CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE + INTERVAL '10 days', 350.00, 'active', 'Executive', 'Finance director'),
      (8, 'PRM-FIN-002', 'Irene Bell', 'ibell@lawfirm.com', 'IBL-0010', 'annual', CURRENT_DATE - INTERVAL '8 months', CURRENT_DATE + INTERVAL '4 months', 300.00, 'active', 'A,B', 'Law firm partner'),
      (10, 'PRM-TCH-001', 'Jack Rivera', 'jrivera@techco.com', 'JRV-0011', 'employee', CURRENT_DATE - INTERVAL '4 months', CURRENT_DATE + INTERVAL '8 months', 60.00, 'active', 'Tech Campus', 'Software engineer'),
      (12, 'PRM-RES-001', 'Karen Scott', 'kscott@home.com', 'KSC-0012', 'monthly', CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE - INTERVAL '15 days', 90.00, 'expired', 'Resident', 'Did not renew'),
      (13, 'PRM-TRN-001', 'Leo Adams', 'ladams@commute.com', 'LAD-0013', 'monthly', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '20 days', 120.00, 'active', 'Commuter', 'Transit hub commuter'),
      (14, 'PRM-ENT-001', 'Mia Turner', 'mturner@talent.com', 'MTR-0014', 'vip', CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE + INTERVAL '23 days', 400.00, 'active', 'VIP,Backstage', 'Talent management VIP'),
      (15, 'PRM-SUB-001', 'Nick Young', 'nyoung@email.com', 'NYG-0015', 'monthly', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '25 days', 65.00, 'active', 'A,B', 'Regular suburban shopper'),
      (1, 'PRM-DT-003', 'Olivia Webb', 'owebb@corp.com', 'OWB-0016', 'monthly', CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE - INTERVAL '30 days', 250.00, 'expired', 'A', 'Former tenant'),
      (5, 'PRM-HOSP-001', 'Dr. Peter Grant', 'pgrant@hospital.org', 'PGR-0017', 'employee', CURRENT_DATE - INTERVAL '6 months', CURRENT_DATE + INTERVAL '6 months', 100.00, 'active', 'Staff,Emergency', 'Attending physician'),
      (3, 'PRM-MALL-001', 'Quinn Baker', 'qbaker@retail.com', 'QBK-0018', 'visitor', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 day', 0.00, 'active', 'Visitor', 'Complimentary visitor pass')
    `);
    console.log('✅ Seeded 18 permits');

    // Seed Analytics Reports
    await pool.query(`
      INSERT INTO analytics_reports (facility_id, report_type, report_name, period_start, period_end, total_revenue, total_transactions, avg_occupancy, peak_occupancy, avg_duration_hours, unique_vehicles, new_customers, returning_customers, status, notes) VALUES
      (1, 'daily', 'Downtown Daily Report', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE, 12500.00, 245, 84.7, 96.2, 3.2, 210, 35, 175, 'generated', 'Strong weekday performance'),
      (1, 'weekly', 'Downtown Weekly Summary', CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE, 78500.00, 1650, 81.3, 97.1, 3.4, 890, 145, 745, 'generated', 'Revenue up 5% WoW'),
      (1, 'monthly', 'Downtown Monthly Overview', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, 335000.00, 7200, 79.8, 98.5, 3.1, 3200, 480, 2720, 'generated', 'Best month this quarter'),
      (2, 'daily', 'Airport Daily Report', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE, 28000.00, 580, 82.5, 94.8, 8.5, 520, 310, 210, 'generated', 'High transient traffic'),
      (2, 'weekly', 'Airport Weekly Summary', CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE, 189000.00, 3900, 85.2, 96.3, 7.8, 2800, 1900, 900, 'generated', 'Holiday week surge'),
      (3, 'monthly', 'Mall Monthly Overview', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, 142000.00, 9800, 72.4, 95.0, 2.1, 6500, 1200, 5300, 'generated', 'Seasonal shopping trends'),
      (4, 'quarterly', 'University Q1 Report', CURRENT_DATE - INTERVAL '90 days', CURRENT_DATE, 98000.00, 16200, 78.5, 92.0, 4.5, 2400, 800, 1600, 'generated', 'Spring semester analysis'),
      (5, 'daily', 'Hospital Daily Report', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE, 5800.00, 150, 85.6, 98.0, 2.8, 130, 45, 85, 'generated', 'Visitor hours peak noted'),
      (6, 'weekly', 'Convention Weekly Report', CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE, 125000.00, 2940, 80.0, 99.2, 3.8, 2500, 2100, 400, 'generated', 'Major convention week'),
      (7, 'monthly', 'Beach Monthly Report', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, 67000.00, 5400, 78.3, 100.0, 4.2, 4200, 2800, 1400, 'generated', 'Summer peak season data'),
      (8, 'daily', 'Financial District Daily', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE, 15800.00, 180, 93.2, 99.0, 6.5, 165, 12, 153, 'generated', 'Near capacity all day'),
      (9, 'weekly', 'Arena Weekly Report', CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE, 95000.00, 4450, 45.0, 98.5, 3.5, 4000, 3200, 800, 'generated', '2 events this week'),
      (10, 'monthly', 'Tech Park Monthly', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, 82000.00, 6100, 80.0, 89.0, 5.2, 1800, 200, 1600, 'generated', 'Stable corporate usage'),
      (11, 'annual', 'Historic District Annual', CURRENT_DATE - INTERVAL '365 days', CURRENT_DATE, 520000.00, 58000, 68.5, 95.0, 3.1, 28000, 12000, 16000, 'generated', 'Full year tourism analysis'),
      (13, 'quarterly', 'Transit Hub Q1', CURRENT_DATE - INTERVAL '90 days', CURRENT_DATE, 115000.00, 15750, 86.3, 97.0, 3.8, 5200, 900, 4300, 'generated', 'Commuter pattern analysis'),
      (14, 'monthly', 'Entertainment Monthly', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, 175000.00, 9300, 72.0, 99.5, 3.2, 7800, 4500, 3300, 'generated', 'Blockbuster movie month'),
      (15, 'weekly', 'Suburban Weekly Report', CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE, 38000.00, 2870, 50.0, 78.0, 1.8, 2200, 350, 1850, 'pending', 'Report generation queued')
    `);
    console.log('✅ Seeded 17 analytics reports');

    // Seed Security Cameras
    await pool.query(`
      INSERT INTO security_cameras (facility_id, camera_name, camera_type, location_zone, stream_url, status, resolution, recording_enabled, motion_detected, notes) VALUES
      (1, 'CAM-DT-ENTRY', 'lpr', 'Main Entrance', 'rtsp://10.0.1.101/stream1', 'active', '4K', true, false, 'License plate reader at entry'),
      (1, 'CAM-DT-EXIT', 'lpr', 'Main Exit', 'rtsp://10.0.1.102/stream1', 'active', '4K', true, false, 'License plate reader at exit'),
      (1, 'CAM-DT-L1', 'ptz', 'Level 1', 'rtsp://10.0.1.103/stream1', 'active', '1080p', true, true, 'Pan-tilt-zoom coverage level 1'),
      (2, 'CAM-AIR-T1', 'fixed', 'Terminal 1 Lot', 'rtsp://10.0.2.101/stream1', 'active', '1080p', true, false, 'Terminal 1 overview'),
      (2, 'CAM-AIR-ENTRY', 'lpr', 'Airport Entry', 'rtsp://10.0.2.102/stream1', 'active', '4K', true, false, 'Airport gate LPR'),
      (3, 'CAM-MALL-N', 'ptz', 'North Wing', 'rtsp://10.0.3.101/stream1', 'active', '1080p', true, true, 'Shopping mall north wing'),
      (4, 'CAM-UNI-MAIN', 'fixed', 'Main Lot', 'rtsp://10.0.4.101/stream1', 'active', '720p', true, false, 'University main lot overview'),
      (5, 'CAM-HOSP-ER', 'thermal', 'ER Entrance', 'rtsp://10.0.5.101/stream1', 'active', '1080p', true, true, 'Thermal cam at ER parking'),
      (6, 'CAM-CNV-ENTRY', 'lpr', 'Convention Entry', 'rtsp://10.0.6.101/stream1', 'active', '4K', true, false, 'Convention center gate'),
      (7, 'CAM-BCH-01', 'fixed', 'Beach Lot A', 'rtsp://10.0.7.101/stream1', 'active', '1080p', true, false, 'Beachfront lot overview'),
      (8, 'CAM-FIN-VIP', 'ptz', 'VIP Level', 'rtsp://10.0.8.101/stream1', 'active', '4K', true, true, 'Executive floor surveillance'),
      (9, 'CAM-ARENA-E', 'fixed', 'East Lot', 'rtsp://10.0.9.101/stream1', 'active', '1080p', true, false, 'Arena east lot coverage'),
      (10, 'CAM-TECH-MAIN', 'ptz', 'Main Campus', 'rtsp://10.0.10.101/stream1', 'maintenance', '1080p', false, false, 'Scheduled lens cleaning'),
      (11, 'CAM-HST-01', 'fixed', 'Heritage Lot', 'rtsp://10.0.11.101/stream1', 'active', '1080p', true, false, 'Historic district camera'),
      (13, 'CAM-TRN-PLAT', 'lpr', 'Platform Entry', 'rtsp://10.0.13.101/stream1', 'active', '4K', true, false, 'Transit hub plate reader'),
      (14, 'CAM-ENT-MAIN', 'ptz', 'Main Entrance', 'rtsp://10.0.14.101/stream1', 'active', '4K', true, true, 'Entertainment district PTZ'),
      (15, 'CAM-SUB-01', 'fixed', 'Lot A', 'rtsp://10.0.15.101/stream1', 'inactive', '720p', false, false, 'Awaiting network upgrade')
    `);
    console.log('✅ Seeded 17 security cameras');

    // Seed Maintenance Tasks
    await pool.query(`
      INSERT INTO maintenance_tasks (facility_id, task_name, task_type, priority, assigned_to, description, status, estimated_cost, actual_cost, scheduled_date, completed_date, notes) VALUES
      (1, 'Level 2 Light Replacement', 'electrical', 'medium', 'Mike Electrician', 'Replace 12 burnt-out LED panels on Level 2', 'completed', 850.00, 780.00, CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE - INTERVAL '3 days', 'Completed under budget'),
      (1, 'Entry Gate Motor Repair', 'repair', 'high', 'Gate Systems Inc', 'Main entry barrier arm motor grinding noise', 'in_progress', 1200.00, NULL, CURRENT_DATE, NULL, 'Parts ordered, ETA 2 days'),
      (2, 'Monthly Safety Inspection', 'inspection', 'medium', 'SafeCheck LLC', 'Routine monthly fire safety and structural inspection', 'pending', 500.00, NULL, CURRENT_DATE + INTERVAL '3 days', NULL, 'Scheduled with inspector'),
      (2, 'Terminal Lot Restriping', 'painting', 'low', 'LineMark Pro', 'Repaint faded parking lines in Terminal 1 lot', 'pending', 3500.00, NULL, CURRENT_DATE + INTERVAL '14 days', NULL, 'Night work required'),
      (3, 'Elevator Maintenance', 'equipment', 'high', 'Otis Elevator Co', 'Annual elevator service - all 4 units', 'in_progress', 4200.00, NULL, CURRENT_DATE - INTERVAL '1 day', NULL, 'Unit 2 completed, 3 remaining'),
      (4, 'Drain Clearing', 'plumbing', 'medium', 'Campus Facilities', 'Clear blocked storm drain in Section C', 'completed', 300.00, 275.00, CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE - INTERVAL '6 days', 'Root intrusion removed'),
      (5, 'Pressure Washing', 'cleaning', 'low', 'CleanSweep Services', 'Deep clean visitor lot surfaces and walkways', 'pending', 1800.00, NULL, CURRENT_DATE + INTERVAL '7 days', NULL, 'Weekend work preferred'),
      (6, 'HVAC Filter Change', 'equipment', 'medium', 'CoolAir HVAC', 'Replace all HVAC filters in enclosed garage levels', 'pending', 950.00, NULL, CURRENT_DATE + INTERVAL '5 days', NULL, 'Quarterly maintenance'),
      (7, 'Pothole Repair', 'repair', 'urgent', 'PavePro Asphalt', 'Large pothole near beach lot entrance - safety hazard', 'in_progress', 2200.00, NULL, CURRENT_DATE, NULL, 'Crew on site'),
      (8, 'Security System Upgrade', 'equipment', 'high', 'SecureTech Ltd', 'Upgrade access control to contactless system', 'pending', 15000.00, NULL, CURRENT_DATE + INTERVAL '21 days', NULL, 'Board approved budget'),
      (9, 'Post-Event Cleanup', 'cleaning', 'medium', 'CleanAll Crew', 'Full lot cleanup after basketball championship', 'completed', 2500.00, 2800.00, CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE - INTERVAL '1 day', 'Extra debris - over budget'),
      (10, 'Solar Panel Inspection', 'inspection', 'low', 'GreenEnergy Co', 'Inspect rooftop solar panel array performance', 'pending', 400.00, NULL, CURRENT_DATE + INTERVAL '10 days', NULL, 'Annual efficiency check'),
      (11, 'Historic Facade Repair', 'repair', 'medium', 'Heritage Builders', 'Repair cracked decorative facade on street side', 'pending', 6500.00, NULL, CURRENT_DATE + INTERVAL '30 days', NULL, 'Requires city permit'),
      (12, 'Landscaping Trim', 'cleaning', 'low', 'GreenThumb Gardens', 'Trim overgrown hedges blocking visibility', 'completed', 350.00, 350.00, CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '9 days', 'Monthly landscape service'),
      (13, 'Ticket Machine Repair', 'repair', 'high', 'ParkTech Support', 'Unit 3 not dispensing tickets - paper jam and sensor fault', 'in_progress', 600.00, NULL, CURRENT_DATE - INTERVAL '1 day', NULL, 'Technician returning tomorrow'),
      (14, 'Emergency Light Test', 'inspection', 'medium', 'FireSafe Inc', 'Test all emergency lighting and exit signs', 'pending', 250.00, NULL, CURRENT_DATE + INTERVAL '4 days', NULL, 'Annual compliance requirement'),
      (15, 'Lot Resurfacing', 'painting', 'low', 'PavePro Asphalt', 'Resurface deteriorated sections of suburban lot', 'cancelled', 12000.00, NULL, CURRENT_DATE + INTERVAL '60 days', NULL, 'Deferred to next fiscal year')
    `);
    console.log('✅ Seeded 17 maintenance tasks');

    // Seed Customer Feedback
    await pool.query(`
      INSERT INTO customer_feedback (facility_id, customer_name, customer_email, rating, category, subject, message, response, status, sentiment) VALUES
      (1, 'Derek Moore', 'dmoore@email.com', 5, 'technology', 'Great mobile app experience', 'The new parking app made finding a spot so easy. Love the real-time availability feature!', 'Thank you Derek! We are glad you enjoy the app. More features coming soon!', 'responded', 'positive'),
      (1, 'Samantha Lee', 'slee@email.com', 2, 'pricing', 'Too expensive for short visits', 'Paid $8.50 for just 30 minutes. There should be a grace period or short-stay discount.', 'We appreciate your feedback. We are reviewing our short-stay pricing policy.', 'responded', 'negative'),
      (2, 'Travel Reviewer', 'traveler@email.com', 4, 'accessibility', 'Good airport parking overall', 'Shuttle service was prompt and the lot is well-lit. Wish there were more covered spots.', NULL, 'reviewed', 'positive'),
      (3, 'Shopaholic Jane', 'jane@email.com', 5, 'general', 'Best mall parking ever', 'Always clean, well-organized, and the free hour with purchase is fantastic.', 'Thank you for your kind words! Happy shopping!', 'responded', 'positive'),
      (4, 'Student Mike', 'smike@univ.edu', 3, 'pricing', 'Student rates could be lower', 'Parking adds up over the semester. Would appreciate more affordable student monthly passes.', NULL, 'reviewed', 'neutral'),
      (5, 'Patient Family', 'pfamily@email.com', 4, 'safety', 'Well-lit and secure', 'Felt safe parking here during evening visiting hours. Security patrol was visible.', NULL, 'new', 'positive'),
      (6, 'Conference Goer', 'confgoer@email.com', 1, 'staff', 'Rude attendant experience', 'The parking attendant at Gate B was dismissive and unhelpful when I asked for directions.', 'We sincerely apologize. This has been escalated to management for immediate review.', 'responded', 'negative'),
      (7, 'Beach Bum', 'beachbum@email.com', 3, 'cleanliness', 'Sandy walkways', 'The lot itself is fine but the pedestrian walkways are always covered in sand. Slippery when wet.', NULL, 'reviewed', 'neutral'),
      (8, 'Finance Pro', 'fpro@finance.com', 5, 'safety', 'Premium security experience', 'Valet service is excellent and the facility is impeccably maintained. Worth every penny.', 'Thank you for being a valued customer!', 'responded', 'positive'),
      (9, 'Sports Fan', 'sfan@email.com', 2, 'pricing', 'Game day prices are outrageous', '$40 for 4 hours during a game is price gouging. Public transit is not a realistic alternative.', 'We understand your concern. We offer pre-purchase discounts through our app.', 'responded', 'negative'),
      (10, 'Tech Worker', 'tworker@techco.com', 4, 'technology', 'EV charging is convenient', 'Love having EV chargers at work. The app shows charger availability which saves time.', NULL, 'new', 'positive'),
      (11, 'Tourist Tom', 'ttom@email.com', 4, 'general', 'Charming location', 'Great location near all the historic sites. Easy to find and reasonable pricing.', NULL, 'new', 'positive'),
      (12, 'Resident Rosa', 'rrosa@email.com', 2, 'accessibility', 'Need more handicap spots', 'Only 4 handicap spaces for 200 spots is not enough. My elderly mother struggles daily.', 'Thank you Rosa. We are working with management to add 6 more accessible spaces by next month.', 'responded', 'negative'),
      (13, 'Daily Commuter', 'commuter@email.com', 4, 'general', 'Reliable commuter parking', 'Been using this for 2 years. Always a spot available if you arrive before 8am. Clean facilities.', NULL, 'new', 'positive'),
      (14, 'Night Owl', 'nightowl@email.com', 3, 'safety', 'Needs better lighting at night', 'Level 3 has several burnt-out lights. Feels a bit unsafe when leaving after late shows.', 'Thank you for reporting this. Our maintenance team has been notified and will address it this week.', 'responded', 'neutral'),
      (15, 'Suburban Mom', 'smom@email.com', 5, 'cleanliness', 'Always spotless', 'This lot is always clean and well-maintained. The landscaping is beautiful too. Great job!', NULL, 'new', 'positive'),
      (3, 'Frustrated Fred', 'ffred@email.com', 1, 'technology', 'Payment machine ate my card', 'The payment kiosk on Level 2 swallowed my credit card. Took 3 days to get it back.', 'We are very sorry Fred. We have replaced that unit and issued you a $50 parking credit.', 'resolved', 'negative')
    `);
    console.log('✅ Seeded 17 customer feedback');

    // Seed Parking Zones
    await pool.query(`
      INSERT INTO parking_zones (facility_id, zone_name, zone_code, zone_type, total_spots, occupied_spots, hourly_rate, is_covered, floor_level, status, max_height_ft, notes) VALUES
      (1, 'Level 1 Regular', 'DT-L1-REG', 'regular', 200, 175, 8.50, true, 1, 'active', 7.0, 'Ground floor general parking'),
      (1, 'Level 1 VIP', 'DT-L1-VIP', 'vip', 30, 28, 15.00, true, 1, 'active', 7.0, 'Near elevator VIP spots'),
      (1, 'Level 2 Regular', 'DT-L2-REG', 'regular', 200, 160, 8.50, true, 2, 'active', 7.0, 'Second floor general parking'),
      (1, 'Level 1 Handicap', 'DT-L1-HC', 'handicap', 20, 12, 8.50, true, 1, 'active', 7.0, 'ADA compliant spaces near entrance'),
      (1, 'Level 2 EV Charging', 'DT-L2-EV', 'ev_charging', 16, 10, 10.00, true, 2, 'active', 7.0, 'EV charging zone with Type 2 and CCS'),
      (2, 'Terminal 1 Main', 'AIR-T1-MAIN', 'regular', 600, 510, 12.00, false, 0, 'active', NULL, 'Open-air terminal 1 lot'),
      (2, 'Terminal 2 Main', 'AIR-T2-MAIN', 'regular', 500, 420, 12.00, false, 0, 'active', NULL, 'Open-air terminal 2 lot'),
      (3, 'Mall Level 1', 'MALL-L1', 'regular', 400, 320, 4.00, true, 1, 'active', 6.5, 'Near food court entrance'),
      (3, 'Mall Compact', 'MALL-COMP', 'compact', 100, 65, 3.50, true, 3, 'active', 6.0, 'Small vehicle spaces on level 3'),
      (4, 'Student Zone A', 'UNI-STU-A', 'regular', 300, 270, 3.50, false, 0, 'active', NULL, 'Main student parking area'),
      (5, 'Visitor Parking', 'HOSP-VIS', 'regular', 150, 140, 6.00, false, 0, 'active', NULL, 'Hospital visitor lot'),
      (5, 'Handicap Zone', 'HOSP-HC', 'handicap', 25, 18, 6.00, false, 0, 'active', NULL, 'Near main hospital entrance'),
      (7, 'Beachfront Row A', 'BCH-ROW-A', 'regular', 100, 95, 7.50, false, 0, 'full', NULL, 'Prime ocean view row'),
      (8, 'Executive Level', 'FIN-EXEC', 'vip', 50, 47, 20.00, true, 1, 'active', 7.5, 'Dedicated executive parking'),
      (9, 'Motorcycle Zone', 'ARENA-MC', 'motorcycle', 50, 15, 10.00, false, 0, 'active', NULL, 'Motorcycle-only section near Gate D'),
      (10, 'EV Charging Hub', 'TECH-EV', 'ev_charging', 24, 14, 7.00, true, 1, 'active', 7.0, 'Tech campus charging stations'),
      (13, 'Loading Dock', 'TRN-LOAD', 'loading', 8, 3, 0.00, true, 0, 'active', 14.0, 'Commercial loading zone'),
      (14, 'VIP Valet', 'ENT-VIP', 'vip', 40, 25, 25.00, true, 1, 'active', 7.0, 'Premium valet service area'),
      (15, 'Section A', 'SUB-A', 'regular', 400, 200, 2.50, false, 0, 'active', NULL, 'Main suburban lot section')
    `);
    console.log('✅ Seeded 19 parking zones');

    console.log('\n🎉 All seed data inserted successfully!');
    console.log('📧 Login: admin@parking.com / admin123');
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    await pool.end();
  }
}

seed();
