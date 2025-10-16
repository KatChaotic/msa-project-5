CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL
);

CREATE TABLE goods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL NOT NULL
);

INSERT INTO users (name, email) VALUES
    ('Алексей Иванов', 'alexey.ivanov@example.com'),
    ('Мария Петрова', 'mariya.petrova@example.com'),
    ('Сергей Михайлов', 'sergey.mihailov@example.com'),
    ('Елена Новикова', 'elena.novikova@example.com'),
    ('Никита Романов', 'nikita.romanov@example.com'),
    ('Анна Сергеева', 'anna.sergeeva@example.com'),
    ('Иван Васильев', 'ivan.vasiliev@example.com'),
    ('Виктория Николаева', 'viktoria.nikolaeva@example.com'),
    ('Владислав Иванов', 'vladislav.ivanov@example.com'),
    ('Ксения Михайлова', 'kseniya.mihailova@example.com');

INSERT INTO goods (name, price) VALUES
    ('Телефон', 1000),
    ('Ноутбук', 2000),
    ('Планшет', 1500),
    ('Компьютер', 3000),
    ('Мышь', 500),
    ('Клавиатура', 800),
    ('Монитор', 1200),
    ('Смартфон', 1500),
    ('Планшет V2', 1800),
    ('Ноутбук V2', 3500);