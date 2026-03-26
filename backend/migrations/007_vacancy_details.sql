-- Расширенные поля вакансии: условия, обязанности, требования, график, ЗП, формат и т.д.
ALTER TABLE vacancies ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}';
