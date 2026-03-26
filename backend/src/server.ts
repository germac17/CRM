import "dotenv/config";
import { spawn } from "child_process";
import cors from "cors";
import crypto from "crypto";
import express from "express";
import fs from "fs";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import * as db from "./db.js";
import { getBotResponse } from "./support-bot.js";
import { sendVerificationEmail } from "./mail.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const AI_PORT = 8001;
const DEFAULT_AI_URL = `http://localhost:${AI_PORT}`;

function startAiService(): void {
  const aiUrl = process.env.AI_SERVICE_URL?.trim() || "";
  if (aiUrl && !aiUrl.includes("localhost") && !aiUrl.includes("127.0.0.1")) {
    return;
  }
  const aiDir = path.resolve(__dirname, "..", "..", "ai");
  if (!fs.existsSync(path.join(aiDir, "app.py"))) {
    return;
  }
  process.env.AI_SERVICE_URL = DEFAULT_AI_URL;
  const candidates: Array<{ cmd: string; args: string[]; label: string }> =
    process.platform === "win32"
      ? [
          { cmd: "py", args: ["-3", "app.py"], label: "py -3" },
          { cmd: "python", args: ["app.py"], label: "python" },
          { cmd: "python3", args: ["app.py"], label: "python3" }
        ]
      : [
          { cmd: "python3", args: ["app.py"], label: "python3" },
          { cmd: "python", args: ["app.py"], label: "python" }
        ];

  const env = { ...process.env, PORT: String(AI_PORT), PYTHONIOENCODING: "utf-8" };

  const trySpawn = (index: number): void => {
    const c = candidates[index];
    if (!c) {
      console.warn("AI-сервис не запущен: не найден Python (py/python/python3). Установите Python и зависимости в папке ai/.");
      return;
    }
    const child = spawn(c.cmd, c.args, { cwd: aiDir, stdio: "ignore", detached: false, env });
    child.on("error", (err: any) => {
      if (err?.code === "ENOENT") {
        trySpawn(index + 1);
        return;
      }
      console.warn("AI-сервис не запущен:", err?.message ?? String(err));
    });
    child.on("exit", (code) => {
      if (code != null && code !== 0) {
        console.warn("AI-сервис завершился с кодом", code);
      }
    });
    console.log(`AI-сервис запускается (${c.label}) на порту`, AI_PORT);
  };

  trySpawn(0);
}

function parseAppUrls(): string[] {
  const raw = process.env.APP_URL ?? "http://localhost:3000";
  return raw
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

const localCorsOrigins = ["http://localhost:3000", "http://localhost:4000", "http://127.0.0.1:3000", "http://127.0.0.1:4000"];
const corsOrigins = [...new Set([...parseAppUrls(), ...localCorsOrigins])];
app.use(cors({
  origin: corsOrigins,
  credentials: true
}));

app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  email_verified_at?: string | null;
};

type Vacancy = {
  id: string;
  user_id: string;
  title: string;
  department: string;
  location: string;
  status: string;
  details?: Record<string, unknown>;
};

type Candidate = {
  id: string;
  user_id: string;
  name: string;
  role: string;
  skills: string[];
  stage: string;
};

type Match = {
  id?: number;
  user_id: string;
  candidate_id: string;
  vacancy_id: string;
  score: number;
  explanation: string;
};

type CalendarEvent = {
  id: string;
  user_id: string;
  title: string;
  date: string;
  time: string;
  participants: string;
  status: string;
  candidate_id?: string;
};

type Communication = {
  id: string;
  user_id: string;
  channel: string;
  template: string;
  audience: string;
  status: string;
};

type SupportMessage = {
  id: string;
  user_id: string;
  content: string;
  sender: "user" | "support";
  timestamp: string;
};

const localDataDir = path.resolve(__dirname, "..", "data");

function getLocalVacanciesPath(userId: string): string {
  return path.join(localDataDir, `user-${userId}-vacancies.json`);
}

function readLocalVacancies(userId: string): Vacancy[] {
  try {
    const filePath = getLocalVacanciesPath(userId);
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Vacancy[]) : [];
  } catch {
    return [];
  }
}

function writeLocalVacancies(userId: string, vacancies: Vacancy[]): void {
  try {
    if (!fs.existsSync(localDataDir)) {
      fs.mkdirSync(localDataDir, { recursive: true });
    }
    fs.writeFileSync(getLocalVacanciesPath(userId), JSON.stringify(vacancies, null, 2), "utf-8");
  } catch {
    // Silent fallback storage error: API should keep working with DB path.
  }
}

const ADMIN_EMAIL = "admin@crm.ru";
const ADMIN_ID = "usr-admin";

const getUserIdFromToken = (token: string): string | null => {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const email = decoded.split(":")[0];
    return email ?? null;
  } catch {
    return null;
  }
};

const createToken = (email: string) => {
  return Buffer.from(`${email}:${Date.now()}`).toString("base64");
};

async function getOrCreateAdmin(): Promise<User> {
  const row = db.getUserById(ADMIN_ID) as User | undefined;
  if (row) return row;
  const password = process.env.ADMIN_PASSWORD ?? "admin";
  const admin: User = {
    id: ADMIN_ID,
    name: "Администратор",
    email: ADMIN_EMAIL,
    password,
    email_verified_at: new Date().toISOString()
  };
  db.upsertUser(admin);
  return admin;
}

const authMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  let user: User | undefined;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    const email = getUserIdFromToken(token);
    if (email) {
      user = db.getUserByEmail(email) as User | undefined;
    }
  }

  if (!user) {
    // Для однопользовательского режима всегда есть админ
    user = await getOrCreateAdmin();
  }

  (req as any).userId = user.id;
  (req as any).userEmail = user.email;
  next();
};

const isAdmin = (req: express.Request): boolean =>
  String((req as any).userEmail ?? "").toLowerCase() === "admin@crm.ru";

// ---- Health ----

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "naymi-backend", db: "json" });
});

// ---- Plans & Subscription ----

const DEFAULT_PLANS = [
  { id: "free", name: "Базовый", slug: "free", price_monthly: 0, price_yearly: null, limit_vacancies: 3, limit_candidates: 50, ai_matching_enabled: false, limit_users: 1, priority_support: false, integrations_allowed: [] },
  { id: "starter", name: "Старт", slug: "starter", price_monthly: 990, price_yearly: 9504, limit_vacancies: 15, limit_candidates: 300, ai_matching_enabled: true, limit_users: 3, priority_support: false, integrations_allowed: [] },
  { id: "pro", name: "Про", slug: "pro", price_monthly: 3990, price_yearly: 38270, limit_vacancies: -1, limit_candidates: 2000, ai_matching_enabled: true, limit_users: 10, priority_support: true, integrations_allowed: [] }
];

app.get("/plans", async (_req, res) => {
  const stored = db.getPlans().filter((p: any) => !p.hidden);
  if (stored.length > 0) {
    const plans = stored.map((p: any) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price_monthly: Number(p.price_monthly),
      price_yearly: p.price_yearly != null ? Number(p.price_yearly) : null,
      limit_vacancies: p.limit_vacancies === -1 ? "∞" : p.limit_vacancies,
      limit_candidates: p.limit_candidates === -1 ? "∞" : p.limit_candidates,
      ai_matching_enabled: p.ai_matching_enabled,
      limit_users: p.limit_users,
      priority_support: p.priority_support,
      integrations_allowed: p.integrations_allowed ?? []
    }));
    return res.json({ data: plans });
  }
  const plans = DEFAULT_PLANS.map((p) => ({
    ...p,
    limit_vacancies: p.limit_vacancies === -1 ? "∞" : p.limit_vacancies,
    limit_candidates: p.limit_candidates === -1 ? "∞" : p.limit_candidates
  }));
  res.json({ data: plans });
});

app.get("/subscription", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const sub = await ensureSubscription(userId);
  if (!sub) return res.status(500).json({ error: "Не удалось загрузить подписку." });
  res.json({ data: sub });
});

// ---- Vacancies ----

app.get("/vacancies", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const vacancies = db.getVacancies(userId).map(({ user_id, created_at, ...rest }: any) => rest);
  const local = readLocalVacancies(userId).map(({ user_id, ...rest }: any) => rest);
  const merged = new Map<string, any>();
  for (const v of local) merged.set(String(v.id), v);
  for (const v of vacancies) merged.set(String(v.id), v);
  res.json({ data: Array.from(merged.values()) });
});

app.post("/vacancies", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  if (FEATURE_TARIFFS && !isAdmin(req)) {
    const sub = await ensureSubscription(userId);
    if (sub && sub.plan.limit_vacancies !== -1) {
      const count = db.countVacancies(userId);
      if (count >= sub.plan.limit_vacancies) {
        return res.status(403).json({ error: "Достигнут лимит вакансий по тарифу." });
      }
    }
  }
  const newVacancy = {
    id: `vac-${Date.now()}`,
    user_id: userId,
    title: String(req.body.title ?? ""),
    department: String(req.body.department ?? ""),
    location: String(req.body.location ?? ""),
    status: String(req.body.status ?? "open"),
    details: req.body.details && typeof req.body.details === "object" ? req.body.details : {}
  };
  db.insertVacancy(userId, newVacancy);
  const localVacancies = readLocalVacancies(userId).filter((item) => item.id !== newVacancy.id);
  writeLocalVacancies(userId, localVacancies);
  const { user_id, ...clean } = newVacancy;
  res.json({ data: clean });
});

app.put("/vacancies/:id", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const updates: Record<string, string | object> = {};
  if (req.body.title != null) updates.title = String(req.body.title);
  if (req.body.department != null) updates.department = String(req.body.department);
  if (req.body.location != null) updates.location = String(req.body.location);
  if (req.body.status != null) updates.status = String(req.body.status);
  if (req.body.details != null && typeof req.body.details === "object") updates.details = req.body.details;

  const data = db.updateVacancy(userId, req.params.id, updates);
  if (!data) {
    const localVacancies = readLocalVacancies(userId);
    const index = localVacancies.findIndex((item) => item.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: "Вакансия не найдена." });
      return;
    }
    const updatedLocal = { ...localVacancies[index], ...(updates as any) };
    localVacancies[index] = updatedLocal;
    writeLocalVacancies(userId, localVacancies);
    const { user_id, ...cleanLocal } = updatedLocal;
    res.json({ data: cleanLocal });
    return;
  }
  const { user_id, created_at, ...clean } = data;
  res.json({ data: clean });
});

app.delete("/vacancies/:id", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  db.deleteMatchesByVacancy(userId, req.params.id);
  db.deleteVacancy(userId, req.params.id);
  const localVacancies = readLocalVacancies(userId).filter((item) => item.id !== req.params.id);
  writeLocalVacancies(userId, localVacancies);
  res.json({ success: true });
});

// ---- Candidates ----

app.get("/candidates", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const candidates = db.getCandidates(userId).map(({ user_id, created_at, ...rest }: any) => rest);
  res.json({ data: candidates });
});

app.post("/candidates", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  if (FEATURE_TARIFFS && !isAdmin(req)) {
    const sub = await ensureSubscription(userId);
    if (sub && sub.plan.limit_candidates !== -1) {
      const count = db.countCandidates(userId);
      if (count >= sub.plan.limit_candidates) {
        return res.status(403).json({ error: "Достигнут лимит кандидатов по тарифу." });
      }
    }
  }
  const newCandidate = {
    id: `cand-${Date.now()}`,
    user_id: userId,
    name: String(req.body.name ?? ""),
    role: String(req.body.role ?? ""),
    skills: Array.isArray(req.body.skills) ? req.body.skills : [],
    stage: String(req.body.stage ?? "Скрининг")
  };
  db.insertCandidate(userId, newCandidate);
  const { user_id, ...clean } = newCandidate;
  res.json({ data: clean });
});

app.put("/candidates/:id", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const updates: Record<string, any> = {};
  if (req.body.name != null) updates.name = String(req.body.name);
  if (req.body.role != null) updates.role = String(req.body.role);
  if (req.body.stage != null) updates.stage = String(req.body.stage);
  if (Array.isArray(req.body.skills)) updates.skills = req.body.skills;

  const data = db.updateCandidate(userId, req.params.id, updates);
  if (!data) { res.status(404).json({ error: "Кандидат не найден." }); return; }
  const { user_id, created_at, ...clean } = data as any;
  res.json({ data: clean });
});

app.delete("/candidates/:id", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  db.deleteMatchesByCandidate(userId, req.params.id);
  db.deleteCalendarEventsByCandidate(userId, req.params.id);
  db.deleteCandidate(userId, req.params.id);
  res.json({ success: true });
});

// ---- Matches ----

app.get("/matches", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const matches = db.getMatches(userId).map((row: any) => ({
    candidateId: row.candidate_id,
    vacancyId: row.vacancy_id,
    score: row.score,
    explanation: row.explanation
  }));
  res.json({ data: matches });
});

app.post("/matches", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const newMatch = {
    user_id: userId,
    candidate_id: String(req.body.candidateId ?? ""),
    score: Number(req.body.score ?? 0),
    explanation: String(req.body.explanation ?? ""),
    vacancy_id: String(req.body.vacancyId ?? "")
  };
  const data = db.insertMatch(userId, newMatch);
  res.json({
    data: {
      candidateId: data.candidate_id,
      vacancyId: data.vacancy_id,
      score: data.score,
      explanation: data.explanation
    }
  });
});

app.delete("/matches/:candidateId", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  db.deleteMatchesByCandidate(userId, req.params.candidateId);
  res.json({ success: true });
});

// ---- Calendar ----

app.get("/calendar", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const events = db.getCalendarEvents(userId).map(({ user_id, created_at, ...rest }: any) => ({
    ...rest,
    candidateId: rest.candidate_id
  }));
  events.forEach((e: any) => delete e.candidate_id);
  res.json({ data: events });
});

app.post("/calendar", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const newEvent = {
    id: `event-${Date.now()}`,
    user_id: userId,
    title: String(req.body.title ?? ""),
    date: String(req.body.date ?? ""),
    time: String(req.body.time ?? ""),
    participants: String(req.body.participants ?? ""),
    status: String(req.body.status ?? "Запланировано"),
    candidate_id: req.body.candidateId ? String(req.body.candidateId) : null
  };
  const data = db.insertCalendarEvent(userId, newEvent);
  const { user_id, created_at, candidate_id, ...clean } = data;
  res.json({ data: { ...clean, candidateId: candidate_id } });
});

app.delete("/calendar/:id", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  db.deleteCalendarEvent(userId, req.params.id);
  res.json({ success: true });
});

// ---- Communications ----

app.get("/communications", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const comms = db.getCommunications(userId).map(({ user_id, created_at, ...rest }: any) => rest);
  res.json({ data: comms });
});

app.post("/communications", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const newComm = {
    id: `comm-${Date.now()}`,
    user_id: userId,
    channel: String(req.body.channel ?? "Email"),
    template: String(req.body.template ?? ""),
    audience: String(req.body.audience ?? ""),
    status: String(req.body.status ?? "Запланировано")
  };
  const data = db.insertCommunication(userId, newComm);
  const { user_id, created_at, ...clean } = data;
  res.json({ data: clean });
});

app.put("/communications/:id", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const updates: Record<string, string> = {};
  if (req.body.channel != null) updates.channel = String(req.body.channel);
  if (req.body.template != null) updates.template = String(req.body.template);
  if (req.body.audience != null) updates.audience = String(req.body.audience);
  if (req.body.status != null) updates.status = String(req.body.status);

  const data = db.updateCommunication(userId, req.params.id, updates);

  if (!data) { res.status(404).json({ error: "Коммуникация не найдена." }); return; }
  const { user_id, created_at, ...clean } = data;
  res.json({ data: clean });
});

app.delete("/communications/:id", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  db.deleteCommunication(userId, req.params.id);
  res.json({ success: true });
});

// ---- Support Chat ----

app.get("/support/messages", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const messages = db.getSupportMessages(userId)
    .sort((a: any, b: any) => (a.timestamp ?? "").localeCompare(b.timestamp ?? ""))
    .map(({ user_id, ...rest }: any) => rest);
  res.json({ data: messages });
});

app.post("/support/messages", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const content = String(req.body.content ?? "").trim();
  const now = new Date().toISOString();

  const userMsg = {
    id: `msg-${Date.now()}`,
    user_id: userId,
    content,
    sender: "user" as const,
    timestamp: now
  };
  db.insertSupportMessage(userId, userMsg);

  const botReply = getBotResponse(content);
  const botMsg = {
    id: `msg-${Date.now()}-bot`,
    user_id: userId,
    content: botReply,
    sender: "support" as const,
    timestamp: new Date().toISOString()
  };
  db.insertSupportMessage(userId, botMsg);

  const { user_id: _1, ...cleanUser } = userMsg;
  const { user_id: _2, ...cleanBot } = botMsg;
  res.json({ data: [cleanUser, cleanBot] });
});

// ---- Admin ----

app.get("/admin/support-chats", authMiddleware, async (req, res) => {
  const userEmail = (req as any).userEmail as string;
  if (userEmail !== "admin@crm.ru") {
    res.status(403).json({ error: "Доступ запрещен." });
    return;
  }

  const users = db.getUsers().filter((u: User) => (u.email ?? "").toLowerCase() !== "admin@crm.ru");

  const chats = users.map((user: User) => {
    const messages = db.getSupportMessages(user.id)
      .sort((a: any, b: any) => (a.timestamp ?? "").localeCompare(b.timestamp ?? ""))
      .map(({ user_id, ...rest }: any) => rest);
    return {
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      messages,
      lastMessage: messages[messages.length - 1]
    };
  });

  res.json({ data: chats.filter((chat) => chat.messages.length > 0) });
});

app.post("/admin/support-reply", authMiddleware, async (req, res) => {
  const userEmail = (req as any).userEmail as string;
  if (userEmail !== "admin@crm.ru") {
    res.status(403).json({ error: "Доступ запрещен." });
    return;
  }

  const targetUserId = String(req.body.userId ?? "");
  const content = String(req.body.content ?? "");
  if (!targetUserId || !content) {
    res.status(400).json({ error: "Укажите userId и content." });
    return;
  }

  const newMsg = {
    id: `msg-${Date.now()}`,
    user_id: targetUserId,
    content,
    sender: "support" as const,
    timestamp: new Date().toISOString()
  };
  db.insertSupportMessage(targetUserId, newMsg);
  const { user_id, ...clean } = newMsg;
  res.json({ data: clean });
});

// ---- Auth ----

const FEATURE_EMAIL_VERIFICATION = process.env.FEATURE_EMAIL_VERIFICATION === "true";
const FEATURE_TARIFFS = process.env.FEATURE_TARIFFS === "true";
const APP_URL = parseAppUrls()[0] ?? "http://localhost:3000";
const BACKEND_URL =
  process.env.BACKEND_URL?.trim() ||
  (process.env.APP_URL ? parseAppUrls()[0] : undefined) ||
  "http://localhost:4000";

type Plan = {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  price_yearly: number | null;
  limit_vacancies: number;
  limit_candidates: number;
  ai_matching_enabled: boolean;
  limit_users: number;
  priority_support: boolean;
  integrations_allowed: string[];
  hidden: boolean;
};

type SubscriptionWithPlan = {
  subscription: { status: string; trial_ends_at: string | null; current_period_ends_at: string };
  plan: Plan;
};

async function getSubscription(userId: string): Promise<SubscriptionWithPlan | null> {
  return db.getSubscriptionByUserId(userId) ?? null;
}

async function ensureSubscription(userId: string): Promise<SubscriptionWithPlan | null> {
  let sub = await getSubscription(userId);
  if (sub) return sub;
  const starterPlan = db.getPlanBySlug("starter");
  const freePlan = db.getPlanBySlug("free");
  const planId = starterPlan?.id ?? freePlan?.id;
  if (!planId) return null;
  const trialEnds = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  db.insertSubscription({
    user_id: userId,
    plan_id: planId,
    status: "trial",
    trial_ends_at: trialEnds,
    current_period_ends_at: trialEnds
  });
  return getSubscription(userId);
}

app.post("/auth/register", async (req, res) => {
  const { name, email, password } = req.body ?? {};
  if (!name || !email || !password) {
    res.status(400).json({ error: "Заполните имя, email и пароль." });
    return;
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  if (db.getUserByEmail(normalizedEmail)) {
    res.status(409).json({ error: "Пользователь уже зарегистрирован." });
    return;
  }

  const allUsers = db.getUsers();
  const newUser: User = {
    id: `usr-${allUsers.length + 1}`,
    name: String(name).trim(),
    email: normalizedEmail,
    password: String(password)
  };

  db.insertUser(newUser);

  const starterPlan = db.getPlanBySlug("starter");
  const freePlan = db.getPlanBySlug("free");
  const planId = starterPlan?.id ?? freePlan?.id;
  if (planId) {
    const trialEnds = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    db.insertSubscription({
      user_id: newUser.id,
      plan_id: planId,
      status: "trial",
      trial_ends_at: trialEnds,
      current_period_ends_at: trialEnds
    });
  }

  if (FEATURE_EMAIL_VERIFICATION) {
    const token = crypto.randomUUID();
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    db.insertVerificationToken({
      user_id: newUser.id,
      token,
      expires_at: expiresAt,
      code
    });
    const verifyUrl = `${BACKEND_URL.replace(/\/$/, "")}/auth/verify?token=${token}`;
    try {
      await sendVerificationEmail(normalizedEmail, verifyUrl, newUser.name, code);
    } catch (err) {
      console.error("Ошибка отправки письма верификации:", err);
    }
    return res.json({
      message: "На указанный email отправлено письмо со ссылкой и кодом подтверждения. Проверьте папку «Спам», если письмо не пришло.",
      requires_verification: true,
      user: { id: newUser.id, name: newUser.name, email: newUser.email }
    });
  }

  res.json({
    token: createToken(newUser.email),
    user: { id: newUser.id, name: newUser.name, email: newUser.email }
  });
});

app.get("/auth/verify", async (req, res) => {
  const token = String(req.query.token ?? "").trim();
  if (!token) {
    return res.redirect(`${APP_URL}/login?error=missing_token`);
  }
  const row = db.getVerificationTokenByToken(token);

  if (!row) {
    return res.redirect(`${APP_URL}/login?error=invalid_or_expired`);
  }

  db.markVerificationTokenUsed(token);
  db.updateUser(row.user_id, { email_verified_at: new Date().toISOString() });

  res.redirect(`${APP_URL}/login?verified=1`);
});

app.post("/auth/verify-code", async (req, res) => {
  const { email, code } = req.body ?? {};
  const normalizedEmail = String(email ?? "").trim().toLowerCase();
  const codeStr = String(code ?? "").trim().replace(/\D/g, "");
  if (!normalizedEmail || codeStr.length !== 6) {
    return res.status(400).json({ error: "Укажите email и 6-значный код из письма." });
  }
  const user = db.getUserByEmail(normalizedEmail);
  if (!user) {
    return res.status(404).json({ error: "Пользователь не найден." });
  }
  const row = db.getVerificationTokenByUserAndCode(user.id, codeStr);
  if (!row) {
    return res.status(400).json({ error: "Код неверный или истёк. Запросите новое письмо, зарегистрировавшись снова." });
  }
  db.markVerificationTokenUsedByUserAndCode(user.id, codeStr);
  db.updateUser(user.id, { email_verified_at: new Date().toISOString() });
  return res.json({ success: true, message: "Email подтверждён. Войдите в систему." });
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ error: "Введите email и пароль." });
    return;
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const passwordStr = String(password);

  // Bootstrap admin for single-admin mode (when DB was cleaned/reset)
  const adminEmail = "admin@crm.ru";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin";
  if (normalizedEmail === adminEmail && passwordStr === adminPassword) {
    const adminRow: User = {
      id: "usr-admin",
      name: "Администратор",
      email: adminEmail,
      password: adminPassword,
      email_verified_at: new Date().toISOString()
    };
    db.upsertUser(adminRow);
    return res.json({
      token: createToken(adminEmail),
      user: { id: adminRow.id, name: adminRow.name, email: adminRow.email }
    });
  }

  const user = db.getUserByEmail(normalizedEmail) as User | undefined;
  if (!user || user.password !== passwordStr) {
    res.status(401).json({ error: "Неверный email или пароль." });
    return;
  }

  if (FEATURE_EMAIL_VERIFICATION && !user.email_verified_at) {
    return res.status(403).json({
      error: "Подтвердите email",
      message: "На указанный адрес отправлено письмо с ссылкой для подтверждения."
    });
  }

  res.json({
    token: createToken(user.email),
    user: { id: user.id, name: user.name, email: user.email }
  });
});

// ---- Integrations ----

const INTEGRATION_SERVICES = ["hh_ru", "linkedin", "google_workspace", "outlook", "slack"] as const;

app.get("/integrations", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const data = db.getIntegrations(userId);
  const byService = new Map(data.map((r: any) => [r.service, r]));
  const list = INTEGRATION_SERVICES.map((service) => {
    const row = byService.get(service);
    return {
      service,
      status: row?.status ?? "disconnected",
      lastSyncAt: row?.last_sync_at ?? null,
      hasKey: !!row?.status && row.status !== "disconnected"
    };
  });
  res.json({ data: list });
});

app.put("/integrations/:service", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const service = String(req.params.service ?? "").toLowerCase().replace(/[^a-z0-9_]/g, "_");
  if (!INTEGRATION_SERVICES.includes(service as any)) {
    res.status(400).json({ error: "Неизвестный сервис." });
    return;
  }
  const apiKey = String(req.body.api_key ?? "").trim();
  if (!apiKey) {
    res.status(400).json({ error: "Укажите API ключ." });
    return;
  }
  db.upsertIntegration(userId, {
    user_id: userId,
    service,
    api_key_encrypted: apiKey,
    status: "connected"
  });
  res.json({ data: { service, status: "connected" } });
});

app.delete("/integrations/:service", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const service = String(req.params.service ?? "").toLowerCase().replace(/[^a-z0-9_]/g, "_");
  db.deleteIntegration(userId, service);
  res.json({ success: true });
});

// Мок-данные для симуляции импорта из внешних сервисов
const getMockVacanciesForService = (service: string) => {
  const base = [
    { title: "Frontend Developer", department: "Разработка", location: "Москва" },
    { title: "Backend Engineer", department: "Разработка", location: "Удалённо" },
    { title: "Product Manager", department: "Продукт", location: "Санкт-Петербург" }
  ];
  return base.map((v, i) => ({ ...v, id: `vac-${service}-${Date.now()}-${i}` }));
};

const getMockCandidatesForService = (service: string) => {
  const base = [
    { name: "Алексей Иванов", role: "Frontend Developer", skills: ["React", "TypeScript", "CSS"] },
    { name: "Мария Петрова", role: "Backend Developer", skills: ["Python", "PostgreSQL", "Docker"] },
    { name: "Дмитрий Сидоров", role: "Product Manager", skills: ["Agile", "Jira", "Analytics"] }
  ];
  return base.map((c, i) => ({ ...c, id: `cand-${service}-${Date.now()}-${i}` }));
};

app.post("/integrations/:service/sync", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const service = String(req.params.service ?? "").toLowerCase().replace(/[^a-z0-9_]/g, "_");
  if (!INTEGRATION_SERVICES.includes(service as any)) {
    res.status(400).json({ error: "Неизвестный сервис." });
    return;
  }

  const integration = db.getIntegrationByService(userId, service);

  if (!integration || integration.status !== "connected") {
    res.status(400).json({ error: "Сначала подключите интеграцию и укажите API ключ." });
    return;
  }

  db.updateIntegration(userId, service, { status: "syncing" });

  try {
    const vacancies = getMockVacanciesForService(service);
    const candidates = getMockCandidatesForService(service);

    for (const v of vacancies) {
      db.insertVacancy(userId, {
        id: v.id,
        user_id: userId,
        title: v.title,
        department: v.department,
        location: v.location,
        status: "open",
        source: service
      });
    }

    for (const c of candidates) {
      db.insertCandidate(userId, {
        id: c.id,
        user_id: userId,
        name: c.name,
        role: c.role,
        skills: c.skills,
        stage: "Поиск",
        source: service
      });
    }

    const now = new Date().toISOString();
    db.updateIntegration(userId, service, { status: "connected", last_sync_at: now });

    res.json({
      data: {
        service,
        status: "connected",
        lastSyncAt: now,
        imported: { vacancies: vacancies.length, candidates: candidates.length }
      }
    });
  } catch (err) {
    db.updateIntegration(userId, service, { status: "error" });
    res.status(500).json({
      error: "Ошибка синхронизации",
      details: err instanceof Error ? err.message : String(err)
    });
  }
});

// ---- AI Matching ----

app.get("/ai/status", authMiddleware, async (_req, res) => {
  const aiServiceUrl = (process.env.AI_SERVICE_URL?.trim() || `http://localhost:${AI_PORT}`).replace(/\/$/, "");
  const maxRetries = 5;
  const retryDelayMs = 3000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const healthRes = await fetch(`${aiServiceUrl}/health`, { signal: controller.signal });
      clearTimeout(timeout);
      const healthJson = await healthRes.json().catch(() => ({} as any));
      if (healthRes.ok) {
        return res.json({
          available: true,
          semantic_backend: (healthJson as any).semantic_backend
        });
      }
    } catch {
      // AI service may still be loading (model takes ~30s)
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, retryDelayMs));
      }
    }
  }

  return res.json({
    available: false,
    message: "AI-сервис не отвечает. Подождите 30–60 секунд после старта (загрузка модели) и обновите страницу. Если не помогло: cd ai && python app.py"
  });
});

app.post("/ai/match/batch", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const { vacancy_id, auto_save } = req.body;

  if (!vacancy_id) {
    res.status(400).json({ error: "Укажите vacancy_id" });
    return;
  }

  const aiServiceUrl = process.env.AI_SERVICE_URL?.trim() || "";
  if (!aiServiceUrl) {
    res.status(503).json({
      error: "AI-матчинг недоступен",
      details: "Настройте AI_SERVICE_URL в переменных окружения backend и разверните AI-сервис"
    });
    return;
  }

  if (FEATURE_TARIFFS && !isAdmin(req)) {
    const sub = await ensureSubscription(userId);
    if (sub && !sub.plan.ai_matching_enabled) {
      return res.status(403).json({ error: "AI-матчинг доступен на платных тарифах." });
    }
  }

  try {
    const vacancy = db.getVacancyById(userId, vacancy_id);
    const candidates = db.getCandidates(userId);
    if (!vacancy) {
      res.status(404).json({ error: "Вакансия не найдена" });
      return;
    }

    const vacancyClean = Object.fromEntries(
      Object.entries(vacancy).filter(([k]) => !["user_id", "created_at"].includes(k))
    );
    const candidatesClean = candidates.map((c: any) =>
      Object.fromEntries(Object.entries(c).filter(([k]) => !["user_id", "created_at"].includes(k)))
    );

    const aiResponse = await fetch(`${aiServiceUrl}/api/match/batch-with-data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vacancy: vacancyClean, candidates: candidatesClean })
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI-сервис: ${aiResponse.status} ${errText}`);
    }

    const aiData = await aiResponse.json() as any;

    if (auto_save && aiData.matches) {
      db.deleteMatchesByVacancy(userId, vacancy_id);

      const newMatches = aiData.matches
        .filter((m: any) => m.score >= 4.0)
        .map((m: any) => ({
          user_id: userId,
          candidate_id: m.candidate_id,
          vacancy_id: m.vacancy_id,
          score: m.score / 10,
          explanation: m.explanation
        }));

      if (newMatches.length > 0) {
        db.insertMatches(userId, newMatches);
      }
    }

    res.json(aiData);
  } catch (error) {
    console.error("Ошибка AI-матчинга:", error);
    res.status(500).json({
      error: "Не удалось выполнить AI-матчинг",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

app.post("/ai/match/analyze", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const { vacancy_id, candidate_id } = req.body;
  if (!vacancy_id || !candidate_id) {
    res.status(400).json({ error: "Укажите vacancy_id и candidate_id" });
    return;
  }

  const aiServiceUrl = process.env.AI_SERVICE_URL?.trim() || "";
  if (!aiServiceUrl) {
    res.status(503).json({
      error: "AI-матчинг недоступен",
      details: "Настройте AI_SERVICE_URL в переменных окружения backend"
    });
    return;
  }

  if (FEATURE_TARIFFS && !isAdmin(req)) {
    const sub = await ensureSubscription(userId);
    if (sub && !sub.plan.ai_matching_enabled) {
      return res.status(403).json({ error: "AI-матчинг доступен на платных тарифах." });
    }
  }

  try {
    const vacancy = db.getVacancyById(userId, vacancy_id);
    const candidate = db.getCandidateById(userId, candidate_id);
    if (!vacancy || !candidate) {
      res.status(404).json({ error: "Вакансия или кандидат не найдены" });
      return;
    }

    const vacancyClean = Object.fromEntries(
      Object.entries(vacancy).filter(([k]) => !["user_id", "created_at"].includes(k))
    );
    const candidateClean = Object.fromEntries(
      Object.entries(candidate).filter(([k]) => !["user_id", "created_at"].includes(k))
    );

    const aiResponse = await fetch(`${aiServiceUrl}/api/match/analyze-with-data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vacancy: vacancyClean, candidate: candidateClean })
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI-сервис: ${aiResponse.status} ${errText}`);
    }

    const aiData = await aiResponse.json();
    res.json(aiData);
  } catch (error) {
    console.error("Ошибка AI-анализа:", error);
    res.status(500).json({
      error: "Не удалось выполнить AI-анализ",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// ---- Static (production: serve frontend only when deployed together) ----

const isProduction = process.env.NODE_ENV === "production";
const frontendDist = path.resolve(__dirname, "../../frontend/dist");

if (isProduction && fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

// ---- Start ----

startAiService();

app.listen(port, () => {
  console.log(`Найми backend: http://localhost:${port}`);
  if (isProduction) {
    console.log(`Фронтенд отдаётся с этого же сервера (${APP_URL})`);
  }
});
