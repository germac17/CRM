/**
 * JSON file-based storage layer.
 * JSON-хранилище в backend/data/. При деплое можно подключить PostgreSQL.
 * При деплое можно подключить PostgreSQL или другую БД.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "..", "data");

function ensureDir(): void {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function readJson<T>(filePath: string, defaultValue: T): T {
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

function writeJson<T>(filePath: string, data: T): void {
  ensureDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// ---- Users ----

const USERS_FILE = path.join(dataDir, "users.json");

export function getUsers(): any[] {
  return readJson<any[]>(USERS_FILE, []);
}

export function getUserById(id: string): any | undefined {
  return getUsers().find((u) => u.id === id);
}

export function getUserByEmail(email: string): any | undefined {
  return getUsers().find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());
}

export function upsertUser(user: any): void {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === user.id);
  const row = { ...user, email_verified_at: user.email_verified_at ?? null };
  if (idx >= 0) users[idx] = row;
  else users.push(row);
  writeJson(USERS_FILE, users);
}

export function insertUser(user: any): void {
  const users = getUsers();
  users.push(user);
  writeJson(USERS_FILE, users);
}

export function updateUser(id: string, updates: Record<string, any>): void {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx >= 0) users[idx] = { ...users[idx], ...updates };
  writeJson(USERS_FILE, users);
}

// ---- Plans ----

const DEFAULT_PLANS = [
  { id: "free", name: "Базовый", slug: "free", price_monthly: 0, price_yearly: null, limit_vacancies: 3, limit_candidates: 50, ai_matching_enabled: false, limit_users: 1, priority_support: false, integrations_allowed: [], hidden: false },
  { id: "starter", name: "Стандарт", slug: "starter", price_monthly: 5000, price_yearly: 50000, limit_vacancies: 15, limit_candidates: 300, ai_matching_enabled: true, limit_users: 3, priority_support: false, integrations_allowed: [], hidden: false },
  { id: "pro", name: "Бизнес", slug: "pro", price_monthly: 10000, price_yearly: 100000, limit_vacancies: -1, limit_candidates: 2000, ai_matching_enabled: true, limit_users: 10, priority_support: true, integrations_allowed: [], hidden: false }
];

export function getPlans(): any[] {
  const file = path.join(dataDir, "plans.json");
  const stored = readJson<any[]>(file, []);
  return stored.length > 0 ? stored : DEFAULT_PLANS;
}

export function getPlanBySlug(slug: string): any | undefined {
  return getPlans().find((p) => p.slug === slug);
}

// ---- Subscriptions ----

const SUBS_FILE = path.join(dataDir, "subscriptions.json");

export function getSubscriptions(): any[] {
  return readJson<any[]>(SUBS_FILE, []);
}

export function getSubscriptionByUserId(userId: string): any | undefined {
  const subs = getSubscriptions();
  const sub = subs.find((s) => s.user_id === userId);
  if (!sub) return undefined;
  const plan = getPlans().find((p) => p.id === sub.plan_id) ?? getPlanBySlug("starter") ?? getPlans()[0];
  return {
    subscription: {
      status: sub.status,
      trial_ends_at: sub.trial_ends_at,
      current_period_ends_at: sub.current_period_ends_at
    },
    plan
  };
}

export function insertSubscription(sub: any): void {
  const subs = getSubscriptions();
  subs.push(sub);
  writeJson(SUBS_FILE, subs);
}

// ---- Per-user collections ----

function userFile(userId: string, collection: string): string {
  return path.join(dataDir, `user-${userId}-${collection}.json`);
}

function readUserCollection<T>(userId: string, collection: string): T[] {
  return readJson<T[]>(userFile(userId, collection), []);
}

function writeUserCollection<T>(userId: string, collection: string, data: T[]): void {
  ensureDir();
  writeJson(userFile(userId, collection), data);
}

function upsertUserCollection<T extends Record<string, unknown>>(userId: string, collection: string, item: T, idField?: string): void {
  const items = readUserCollection<any>(userId, collection);
  const key = idField ?? "id";
  const id = (item as any)[key];
  const idx = items.findIndex((x: any) => x[key] === id);
  if (idx >= 0) items[idx] = item;
  else items.push(item);
  writeUserCollection(userId, collection, items);
}

// Vacancies
export function getVacancies(userId: string): any[] {
  return readUserCollection(userId, "vacancies");
}

export function getVacancyById(userId: string, id: string): any | undefined {
  return getVacancies(userId).find((v) => v.id === id);
}

export function insertVacancy(userId: string, vacancy: any): any {
  const items = getVacancies(userId);
  items.push(vacancy);
  writeUserCollection(userId, "vacancies", items);
  return vacancy;
}

export function updateVacancy(userId: string, id: string, updates: Record<string, any>): any | undefined {
  const items = getVacancies(userId);
  const idx = items.findIndex((v) => v.id === id);
  if (idx < 0) return undefined;
  items[idx] = { ...items[idx], ...updates };
  writeUserCollection(userId, "vacancies", items);
  return items[idx];
}

export function deleteVacancy(userId: string, id: string): void {
  writeUserCollection(userId, "vacancies", getVacancies(userId).filter((v) => v.id !== id));
}

export function countVacancies(userId: string): number {
  return getVacancies(userId).length;
}

// Candidates
export function getCandidates(userId: string): any[] {
  return readUserCollection(userId, "candidates");
}

export function getCandidateById(userId: string, id: string): any | undefined {
  return getCandidates(userId).find((c) => c.id === id);
}

export function insertCandidate(userId: string, candidate: any): any {
  const items = getCandidates(userId);
  items.push(candidate);
  writeUserCollection(userId, "candidates", items);
  return candidate;
}

export function updateCandidate(userId: string, id: string, updates: Record<string, any>): any | undefined {
  const items = getCandidates(userId);
  const idx = items.findIndex((c) => c.id === id);
  if (idx < 0) return undefined;
  items[idx] = { ...items[idx], ...updates };
  writeUserCollection(userId, "candidates", items);
  return items[idx];
}

export function deleteCandidate(userId: string, id: string): void {
  writeUserCollection(userId, "candidates", getCandidates(userId).filter((c) => c.id !== id));
}

export function countCandidates(userId: string): number {
  return getCandidates(userId).length;
}

// Matches
export function getMatches(userId: string): any[] {
  return readUserCollection(userId, "matches");
}

export function insertMatch(userId: string, match: any): any {
  const items = getMatches(userId);
  const m = { ...match, id: match.id ?? `match-${Date.now()}` };
  items.push(m);
  writeUserCollection(userId, "matches", items);
  return m;
}

export function insertMatches(userId: string, matches: any[]): void {
  const items = getMatches(userId);
  matches.forEach((m) => items.push({ ...m, id: m.id ?? `match-${Date.now()}-${Math.random().toString(36).slice(2)}` }));
  writeUserCollection(userId, "matches", items);
}

export function deleteMatchesByVacancy(userId: string, vacancyId: string): void {
  writeUserCollection(userId, "matches", getMatches(userId).filter((m) => m.vacancy_id !== vacancyId));
}

export function deleteMatchesByCandidate(userId: string, candidateId: string): void {
  writeUserCollection(userId, "matches", getMatches(userId).filter((m) => m.candidate_id !== candidateId));
}

// Calendar events
export function getCalendarEvents(userId: string): any[] {
  return readUserCollection(userId, "calendar_events");
}

export function insertCalendarEvent(userId: string, event: any): any {
  const items = getCalendarEvents(userId);
  items.push(event);
  writeUserCollection(userId, "calendar_events", items);
  return event;
}

export function deleteCalendarEvent(userId: string, id: string): void {
  writeUserCollection(userId, "calendar_events", getCalendarEvents(userId).filter((e) => e.id !== id));
}

export function deleteCalendarEventsByCandidate(userId: string, candidateId: string): void {
  writeUserCollection(userId, "calendar_events", getCalendarEvents(userId).filter((e) => e.candidate_id !== candidateId));
}

// Communications
export function getCommunications(userId: string): any[] {
  return readUserCollection(userId, "communications");
}

export function insertCommunication(userId: string, comm: any): any {
  const items = getCommunications(userId);
  items.push(comm);
  writeUserCollection(userId, "communications", items);
  return comm;
}

export function updateCommunication(userId: string, id: string, updates: Record<string, any>): any | undefined {
  const items = getCommunications(userId);
  const idx = items.findIndex((c) => c.id === id);
  if (idx < 0) return undefined;
  items[idx] = { ...items[idx], ...updates };
  writeUserCollection(userId, "communications", items);
  return items[idx];
}

export function deleteCommunication(userId: string, id: string): void {
  writeUserCollection(userId, "communications", getCommunications(userId).filter((c) => c.id !== id));
}

// Support messages
export function getSupportMessages(userId: string): any[] {
  return readUserCollection(userId, "support_messages");
}

export function insertSupportMessage(userId: string, msg: any): void {
  const items = getSupportMessages(userId);
  items.push(msg);
  writeUserCollection(userId, "support_messages", items);
}

export function getSupportMessagesAllUsers(): { userId: string; messages: any[] }[] {
  const users = getUsers().filter((u) => (u.email ?? "").toLowerCase() !== "admin@crm.ru");
  return users.map((u) => ({ userId: u.id, user: u, messages: getSupportMessages(u.id) }));
}

// Verification tokens
const VERIFICATION_FILE = path.join(dataDir, "verification_tokens.json");

export function getVerificationTokens(): any[] {
  return readJson<any[]>(VERIFICATION_FILE, []);
}

export function insertVerificationToken(tok: any): void {
  const items = getVerificationTokens();
  items.push(tok);
  writeJson(VERIFICATION_FILE, items);
}

export function getVerificationTokenByToken(token: string): any | undefined {
  const now = new Date().toISOString();
  return getVerificationTokens().find(
    (t) => t.token === token && !t.used_at && t.expires_at > now
  );
}

export function getVerificationTokenByUserAndCode(userId: string, code: string): any | undefined {
  const now = new Date().toISOString();
  return getVerificationTokens().find(
    (t) => t.user_id === userId && t.code === code && !t.used_at && t.expires_at > now
  );
}

export function markVerificationTokenUsed(token: string): void {
  const items = getVerificationTokens();
  const idx = items.findIndex((t) => t.token === token);
  if (idx >= 0) items[idx] = { ...items[idx], used_at: new Date().toISOString() };
  writeJson(VERIFICATION_FILE, items);
}

export function markVerificationTokenUsedByUserAndCode(userId: string, code: string): void {
  const items = getVerificationTokens();
  const idx = items.findIndex((t) => t.user_id === userId && t.code === code);
  if (idx >= 0) items[idx] = { ...items[idx], used_at: new Date().toISOString() };
  writeJson(VERIFICATION_FILE, items);
}

// Integrations
export function getIntegrations(userId: string): any[] {
  return readUserCollection(userId, "integrations");
}

export function getIntegrationByService(userId: string, service: string): any | undefined {
  return getIntegrations(userId).find((i) => i.service === service);
}

export function upsertIntegration(userId: string, integration: any): void {
  const items = getIntegrations(userId);
  const idx = items.findIndex((i) => i.service === integration.service);
  const row = { ...integration, user_id: userId };
  if (idx >= 0) items[idx] = row;
  else items.push(row);
  writeUserCollection(userId, "integrations", items);
}

export function updateIntegration(userId: string, service: string, updates: Record<string, any>): void {
  const items = getIntegrations(userId);
  const idx = items.findIndex((i) => i.service === service);
  if (idx >= 0) items[idx] = { ...items[idx], ...updates };
  writeUserCollection(userId, "integrations", items);
}

export function deleteIntegration(userId: string, service: string): void {
  writeUserCollection(userId, "integrations", getIntegrations(userId).filter((i) => i.service !== service));
}
