# Базовая модель данных (черновик)

## Кандидат
- id, personal_info, contact_info
- resume, skills, experience, education
- status, stage, source, consent

## Сотрудник
- id, profile, role, team
- performance_records
- lifecycle_events

## Вакансия
- id, title, department, location
- requirements, skills_required
- hiring_manager, status

## Отклик
- id, candidate_id, vacancy_id
- stage, score, notes
- interviews, offers

## Коммуникация
- id, type (email/sms/chat)
- template_id, content, status

## Интервью
- id, participants, schedule
- notes, evaluation, outcome

## Задача онбординга
- id, employee_id, workflow_id
- status, due_date, owner

## Аудит-лог
- id, actor, action, entity
- timestamp, metadata
