-- Оставить в сервисе только пользователя admin@crm.ru
-- Остальные пользователи и связанные с ними данные удаляются (CASCADE).

DELETE FROM users WHERE email != 'admin@crm.ru';

-- Убедиться, что админ есть (на случай пустой БД)
INSERT INTO users (id, name, email, password)
VALUES ('usr-admin', 'Администратор', 'admin@crm.ru', 'admin')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, password = EXCLUDED.password;
