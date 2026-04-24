require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const { Pool } = require('pg');

const dbUrl = process.env.DATABASE_URL || '';
const adminConnStr = dbUrl.replace('/ai_parking_platform', '/postgres');
const adminPool = new Pool({
  connectionString: adminConnStr,
});

async function setupDatabase() {
  try {
    const dbCheck = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = 'ai_parking_platform'"
    );
    if (dbCheck.rows.length === 0) {
      await adminPool.query('CREATE DATABASE ai_parking_platform');
      console.log('✅ Database ai_parking_platform created');
    } else {
      console.log('✅ Database ai_parking_platform already exists');
    }
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log('✅ Database already exists');
    } else {
      console.error('DB creation error:', err.message);
    }
  } finally {
    await adminPool.end();
  }

  const appPool = new Pool({ connectionString: process.env.DATABASE_URL });

  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'operator',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS facilities (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      address VARCHAR(500),
      total_spaces INTEGER NOT NULL DEFAULT 500,
      hourly_rate DECIMAL(10,2) DEFAULT 5.00,
      facility_type VARCHAR(50) DEFAULT 'garage',
      status VARCHAR(50) DEFAULT 'active',
      latitude DECIMAL(10,7),
      longitude DECIMAL(10,7),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS occupancy_records (
      id SERIAL PRIMARY KEY,
      facility_id INTEGER REFERENCES facilities(id) ON DELETE CASCADE,
      occupied_spaces INTEGER NOT NULL,
      total_spaces INTEGER NOT NULL,
      occupancy_rate DECIMAL(5,1),
      prediction_confidence DECIMAL(5,1) DEFAULT 0,
      predicted_occupancy DECIMAL(5,1) DEFAULT 0,
      notes TEXT DEFAULT '',
      recorded_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS pricing_rules (
      id SERIAL PRIMARY KEY,
      facility_id INTEGER REFERENCES facilities(id) ON DELETE CASCADE,
      rule_name VARCHAR(255) NOT NULL,
      base_rate DECIMAL(10,2) NOT NULL,
      peak_multiplier DECIMAL(5,2) DEFAULT 1.5,
      off_peak_multiplier DECIMAL(5,2) DEFAULT 0.8,
      surge_threshold INTEGER DEFAULT 85,
      time_start TIME DEFAULT '08:00',
      time_end TIME DEFAULT '18:00',
      day_type VARCHAR(50) DEFAULT 'weekday',
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS plate_records (
      id SERIAL PRIMARY KEY,
      facility_id INTEGER REFERENCES facilities(id) ON DELETE CASCADE,
      plate_number VARCHAR(20) NOT NULL,
      state VARCHAR(10) DEFAULT 'CA',
      vehicle_type VARCHAR(50) DEFAULT 'sedan',
      entry_exit VARCHAR(10) DEFAULT 'entry',
      confidence DECIMAL(5,1) DEFAULT 95.0,
      camera_id VARCHAR(50) DEFAULT 'CAM-01',
      notes TEXT DEFAULT '',
      captured_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS violations (
      id SERIAL PRIMARY KEY,
      facility_id INTEGER REFERENCES facilities(id) ON DELETE CASCADE,
      plate_number VARCHAR(20) NOT NULL,
      violation_type VARCHAR(100) NOT NULL,
      fine_amount DECIMAL(10,2) NOT NULL,
      description TEXT DEFAULT '',
      status VARCHAR(50) DEFAULT 'pending',
      zone VARCHAR(20) DEFAULT 'A1',
      evidence_url TEXT DEFAULT '',
      issued_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS revenue_records (
      id SERIAL PRIMARY KEY,
      facility_id INTEGER REFERENCES facilities(id) ON DELETE CASCADE,
      record_date DATE NOT NULL,
      total_revenue DECIMAL(12,2) DEFAULT 0,
      parking_revenue DECIMAL(12,2) DEFAULT 0,
      violation_revenue DECIMAL(12,2) DEFAULT 0,
      subscription_revenue DECIMAL(12,2) DEFAULT 0,
      transactions_count INTEGER DEFAULT 0,
      avg_duration_hours DECIMAL(5,1) DEFAULT 0,
      optimization_score DECIMAL(5,1) DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      facility_id INTEGER REFERENCES facilities(id) ON DELETE CASCADE,
      plate_number VARCHAR(20) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      payment_method VARCHAR(50) DEFAULT 'mobile',
      payment_status VARCHAR(50) DEFAULT 'completed',
      duration_hours DECIMAL(5,1) DEFAULT 1,
      phone_number VARCHAR(20) DEFAULT '',
      transaction_ref VARCHAR(100) DEFAULT '',
      notes TEXT DEFAULT '',
      payment_time TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sensors (
      id SERIAL PRIMARY KEY,
      facility_id INTEGER REFERENCES facilities(id) ON DELETE CASCADE,
      sensor_name VARCHAR(255) NOT NULL,
      sensor_type VARCHAR(50) DEFAULT 'occupancy',
      location_zone VARCHAR(50) DEFAULT 'A1',
      status VARCHAR(50) DEFAULT 'online',
      battery_level DECIMAL(5,1) DEFAULT 100,
      last_reading VARCHAR(255) DEFAULT '',
      last_ping_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ev_stations (
      id SERIAL PRIMARY KEY,
      facility_id INTEGER REFERENCES facilities(id) ON DELETE CASCADE,
      station_name VARCHAR(255) NOT NULL,
      connector_type VARCHAR(50) DEFAULT 'Type2',
      power_kw DECIMAL(6,1) DEFAULT 7.4,
      status VARCHAR(50) DEFAULT 'available',
      current_vehicle_plate VARCHAR(20) DEFAULT '',
      session_start TIMESTAMP,
      energy_delivered_kwh DECIMAL(8,2) DEFAULT 0,
      rate_per_kwh DECIMAL(6,2) DEFAULT 0.35,
      notes TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id SERIAL PRIMARY KEY,
      facility_id INTEGER REFERENCES facilities(id) ON DELETE CASCADE,
      customer_name VARCHAR(255) NOT NULL,
      customer_email VARCHAR(255) DEFAULT '',
      customer_phone VARCHAR(20) DEFAULT '',
      plate_number VARCHAR(20) DEFAULT '',
      spot_number VARCHAR(20) DEFAULT '',
      start_time TIMESTAMP NOT NULL,
      end_time TIMESTAMP NOT NULL,
      status VARCHAR(50) DEFAULT 'confirmed',
      total_amount DECIMAL(10,2) DEFAULT 0,
      payment_method VARCHAR(50) DEFAULT 'credit_card',
      notes TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS permits (
      id SERIAL PRIMARY KEY,
      facility_id INTEGER REFERENCES facilities(id) ON DELETE CASCADE,
      permit_number VARCHAR(50) NOT NULL,
      holder_name VARCHAR(255) NOT NULL,
      holder_email VARCHAR(255) DEFAULT '',
      plate_number VARCHAR(20) DEFAULT '',
      permit_type VARCHAR(50) DEFAULT 'monthly',
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      monthly_rate DECIMAL(10,2) DEFAULT 0,
      status VARCHAR(50) DEFAULT 'active',
      zone_access VARCHAR(100) DEFAULT 'all',
      notes TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS analytics_reports (
      id SERIAL PRIMARY KEY,
      facility_id INTEGER REFERENCES facilities(id) ON DELETE CASCADE,
      report_type VARCHAR(50) DEFAULT 'daily',
      report_name VARCHAR(255) NOT NULL,
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      total_revenue DECIMAL(12,2) DEFAULT 0,
      total_transactions INTEGER DEFAULT 0,
      avg_occupancy DECIMAL(5,1) DEFAULT 0,
      peak_occupancy DECIMAL(5,1) DEFAULT 0,
      avg_duration_hours DECIMAL(5,1) DEFAULT 0,
      unique_vehicles INTEGER DEFAULT 0,
      new_customers INTEGER DEFAULT 0,
      returning_customers INTEGER DEFAULT 0,
      status VARCHAR(50) DEFAULT 'generated',
      notes TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS security_cameras (
      id SERIAL PRIMARY KEY,
      facility_id INTEGER REFERENCES facilities(id) ON DELETE CASCADE,
      camera_name VARCHAR(255) NOT NULL,
      camera_type VARCHAR(50) DEFAULT 'fixed',
      location_zone VARCHAR(50) DEFAULT 'A1',
      stream_url TEXT DEFAULT '',
      status VARCHAR(50) DEFAULT 'active',
      resolution VARCHAR(20) DEFAULT '1080p',
      recording_enabled BOOLEAN DEFAULT true,
      motion_detected BOOLEAN DEFAULT false,
      last_motion_at TIMESTAMP DEFAULT NOW(),
      notes TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS maintenance_tasks (
      id SERIAL PRIMARY KEY,
      facility_id INTEGER REFERENCES facilities(id) ON DELETE CASCADE,
      task_name VARCHAR(255) NOT NULL,
      task_type VARCHAR(50) DEFAULT 'repair',
      priority VARCHAR(20) DEFAULT 'medium',
      assigned_to VARCHAR(255) DEFAULT '',
      description TEXT DEFAULT '',
      status VARCHAR(50) DEFAULT 'pending',
      estimated_cost DECIMAL(10,2) DEFAULT 0,
      actual_cost DECIMAL(10,2) DEFAULT 0,
      scheduled_date DATE,
      completed_date DATE,
      notes TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS customer_feedback (
      id SERIAL PRIMARY KEY,
      facility_id INTEGER REFERENCES facilities(id) ON DELETE CASCADE,
      customer_name VARCHAR(255) DEFAULT '',
      customer_email VARCHAR(255) DEFAULT '',
      rating INTEGER DEFAULT 5,
      category VARCHAR(50) DEFAULT 'general',
      subject VARCHAR(255) DEFAULT '',
      message TEXT DEFAULT '',
      response TEXT DEFAULT '',
      status VARCHAR(50) DEFAULT 'new',
      sentiment VARCHAR(20) DEFAULT 'neutral',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS parking_zones (
      id SERIAL PRIMARY KEY,
      facility_id INTEGER REFERENCES facilities(id) ON DELETE CASCADE,
      zone_name VARCHAR(255) NOT NULL,
      zone_code VARCHAR(20) NOT NULL,
      zone_type VARCHAR(50) DEFAULT 'regular',
      total_spots INTEGER DEFAULT 50,
      occupied_spots INTEGER DEFAULT 0,
      hourly_rate DECIMAL(10,2) DEFAULT 5.00,
      is_covered BOOLEAN DEFAULT false,
      floor_level VARCHAR(20) DEFAULT 'G',
      status VARCHAR(50) DEFAULT 'active',
      max_height_ft DECIMAL(4,1) DEFAULT 7.0,
      notes TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      user_name VARCHAR(255) DEFAULT '',
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(100) NOT NULL,
      entity_id INTEGER,
      description TEXT DEFAULT '',
      ip_address VARCHAR(45) DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      message TEXT DEFAULT '',
      type VARCHAR(50) DEFAULT 'info',
      is_read BOOLEAN DEFAULT false,
      link VARCHAR(500) DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  try {
    await appPool.query(schema);
    console.log('✅ All tables created successfully');
  } catch (err) {
    console.error('Schema error:', err.message);
  } finally {
    await appPool.end();
  }
}

setupDatabase();
