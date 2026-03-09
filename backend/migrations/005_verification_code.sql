-- Код подтверждения (6 цифр) для верификации по коду из письма
ALTER TABLE verification_tokens ADD COLUMN IF NOT EXISTS code VARCHAR(6);
