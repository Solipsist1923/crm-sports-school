-- CRM для спортивної школи - Схема бази даних

-- Таблиця користувачів системи (адміністратори та тренери)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK(role IN ('admin', 'trainer')),
    full_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблиця прайс-листа (Каталог послуг)
CREATE TABLE IF NOT EXISTS price_list (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(50) DEFAULT 'subscription', -- subscription, single, individual, other
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблиця тренерів
CREATE TABLE trainers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    specialization VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Таблиця груп
CREATE TABLE groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    schedule TEXT,
    trainer_id INTEGER,
    max_students INTEGER DEFAULT 15,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE SET NULL
);

-- Таблиця учнів
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    birth_date DATE NOT NULL,
    phone_parent VARCHAR(20) NOT NULL,
    telegram_parent VARCHAR(100),
    group_id INTEGER,
    trainer_id INTEGER,
    photo VARCHAR(255),
    notes TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL,
    FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE SET NULL
);

-- Таблиця відвідувань
CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK(status IN ('present', 'absent', 'sick', 'excused')),
    notes TEXT,
    marked_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(student_id, date)
);

-- Таблиця абонементів
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL,
    total_classes INTEGER NOT NULL,
    remaining_classes INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Таблиця оплат
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_date DATE NOT NULL,
    next_payment_date DATE,
    payment_type VARCHAR(50) NOT NULL CHECK(payment_type IN ('subscription', 'insurance', 'fund', 'other')),
    status VARCHAR(20) NOT NULL DEFAULT 'paid' CHECK(status IN ('paid', 'pending', 'overdue')),
    notes TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Таблиця страховок
CREATE TABLE insurance (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL,
    insurance_company VARCHAR(100),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Таблиця фонду/додаткових зборів
CREATE TABLE fund_payments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    purpose VARCHAR(200) NOT NULL,
    payment_date DATE,
    is_paid BOOLEAN DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Таблиця сповіщень
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL CHECK(type IN ('payment_reminder', 'subscription_expiring', 'insurance_expiring', 'custom')),
    message TEXT NOT NULL,
    scheduled_date DATE NOT NULL,
    sent_date TIMESTAMP,
    is_sent BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Індекси для оптимізації запитів
CREATE INDEX idx_students_group ON students(group_id);
CREATE INDEX idx_students_trainer ON students(trainer_id);
CREATE INDEX idx_students_active ON students(is_active);
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_payments_student ON payments(student_id);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_payments_next_date ON payments(next_payment_date);
CREATE INDEX idx_subscriptions_student ON subscriptions(student_id);
CREATE INDEX idx_subscriptions_active ON subscriptions(is_active);
CREATE INDEX idx_insurance_student ON insurance(student_id);
CREATE INDEX idx_insurance_active ON insurance(is_active);
CREATE INDEX idx_notifications_sent ON notifications(is_sent);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_date);

-- Тригери для автоматичного оновлення updated_at
CREATE TRIGGER update_students_timestamp
AFTER UPDATE ON students
BEGIN
    UPDATE students SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_subscriptions_timestamp
AFTER UPDATE ON subscriptions
BEGIN
    UPDATE subscriptions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_insurance_timestamp
AFTER UPDATE ON insurance
BEGIN
    UPDATE insurance SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Тригер для автоматичного списування занять з абонемента при відмітці відвідування
CREATE TRIGGER decrease_subscription_classes
AFTER INSERT ON attendance
WHEN NEW.status = 'present'
BEGIN
    UPDATE subscriptions
    SET remaining_classes = remaining_classes - 1
    WHERE student_id = NEW.student_id
    AND is_active = 1
    AND remaining_classes > 0;
END;

-- View для швидкого доступу до інформації про учнів з боргами
CREATE VIEW students_with_debts AS
SELECT
    s.id,
    s.first_name,
    s.last_name,
    s.phone_parent,
    p.next_payment_date,
    CASE
        WHEN p.next_payment_date < DATE('now') THEN 'overdue'
        WHEN p.next_payment_date <= DATE('now', '+3 days') THEN 'due_soon'
        ELSE 'ok'
    END as payment_status
FROM students s
LEFT JOIN payments p ON s.id = p.student_id
WHERE s.is_active = 1
AND (p.next_payment_date IS NULL OR p.next_payment_date <= DATE('now', '+7 days'))
ORDER BY p.next_payment_date ASC;

-- View для учнів з абонементами, що закінчуються
CREATE VIEW students_expiring_subscriptions AS
SELECT
    s.id,
    s.first_name,
    s.last_name,
    s.phone_parent,
    sub.remaining_classes,
    sub.end_date
FROM students s
INNER JOIN subscriptions sub ON s.id = sub.student_id
WHERE s.is_active = 1
AND sub.is_active = 1
AND (sub.remaining_classes <= 3 OR sub.end_date <= DATE('now', '+7 days'))
ORDER BY sub.remaining_classes ASC, sub.end_date ASC;

-- View для учнів з страховками, що закінчуються
CREATE VIEW students_expiring_insurance AS
SELECT
    s.id,
    s.first_name,
    s.last_name,
    s.phone_parent,
    i.end_date,
    i.insurance_company
FROM students s
INNER JOIN insurance i ON s.id = i.student_id
WHERE s.is_active = 1
AND i.is_active = 1
AND i.end_date <= DATE('now', '+14 days')
ORDER BY i.end_date ASC;

-- View для статистики відвідувань
CREATE VIEW attendance_statistics AS
SELECT
    s.id as student_id,
    s.first_name,
    s.last_name,
    COUNT(CASE WHEN a.status = 'present' THEN 1 END) as total_present,
    COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as total_absent,
    COUNT(CASE WHEN a.status = 'sick' THEN 1 END) as total_sick,
    COUNT(*) as total_classes,
    ROUND(COUNT(CASE WHEN a.status = 'present' THEN 1 END) * 100.0 / COUNT(*), 2) as attendance_rate
FROM students s
LEFT JOIN attendance a ON s.id = a.student_id
WHERE s.is_active = 1
GROUP BY s.id, s.first_name, s.last_name;
