import "dotenv/config";
import cors from "cors";
import crypto from "crypto";
import express from "express";
import fs from "fs";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { supabase } from "./supabase.js";
import { getBotResponse } from "./support-bot.js";
import { sendVerificationEmail } from "./mail.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

const APP_ORIGIN = process.env.APP_URL ?? "http://localhost:3000";
app.use(cors({
  origin: [APP_ORIGIN, "http://localhost:3000", "http://localhost:4000", "http://127.0.0.1:3000", "http://127.0.0.1:4000"],
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

const authMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Требуется авторизация." });
    return;
  }

  const token = authHeader.replace("Bearer ", "");
  const email = getUserIdFromToken(token);
  if (!email) {
    res.status(401).json({ error: "Неверный токен." });
    return;
  }

  const { data: users } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .limit(1);

  const user = users?.[0] as User | undefined;
  if (!user) {
    res.status(401).json({ error: "Пользователь не найден." });
    return;
  }

  (req as any).userId = user.id;
  (req as any).userEmail = user.email;
  next();
};

const isAdmin = (req: express.Request): boolean =>
  String((req as any).userEmail ?? "").toLowerCase() === "admin@crm.ru";

// ---- Health ----

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "naymi-backend", db: "supabase" });
});

// ---- Plans & Subscription ----

const DEFAULT_PLANS = [
  { id: "free", name: "Базовый", slug: "free", price_monthly: 0, price_yearly: null, limit_vacancies: 3, limit_candidates: 50, ai_matching_enabled: false, limit_users: 1, priority_support: false, integrations_allowed: [] },
  { id: "starter", name: "Старт", slug: "starter", price_monthly: 990, price_yearly: 9504, limit_vacancies: 15, limit_candidates: 300, ai_matching_enabled: true, limit_users: 3, priority_support: false, integrations_allowed: [] },
  { id: "pro", name: "Про", slug: "pro", price_monthly: 3990, price_yearly: 38270, limit_vacancies: -1, limit_candidates: 2000, ai_matching_enabled: true, limit_users: 10, priority_support: true, integrations_allowed: [] }
];

app.get("/plans", async (_req, res) => {
  try {
    const { data } = await supabase
      .from("plans")
      .select("*")
      .eq("hidden", false)
      .order("price_monthly", { ascending: true });
    if (data && data.length > 0) {
      const plans = data.map((p: any) => ({
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
  } catch (_) { /* table may not exist */ }
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
  const { data } = await supabase.from("vacancies").select("*").eq("user_id", userId);
  const vacancies = (data ?? []).map(({ user_id, created_at, ...rest }) => rest);
  res.json({ data: vacancies });
});

app.post("/vacancies", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  if (FEATURE_TARIFFS && !isAdmin(req)) {
    const sub = await ensureSubscription(userId);
    if (sub && sub.plan.limit_vacancies !== -1) {
      const { count } = await supabase.from("vacancies").select("id", { count: "exact", head: true }).eq("user_id", userId);
      if ((count ?? 0) >= sub.plan.limit_vacancies) {
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
    status: String(req.body.status ?? "open")
  };
  const { data, error } = await supabase.from("vacancies").insert(newVacancy).select().single();
  if (error) { res.status(500).json({ error: error.message }); return; }
  const { user_id, created_at, ...clean } = data;
  res.json({ data: clean });
});

app.put("/vacancies/:id", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const updates: Record<string, string> = {};
  if (req.body.title != null) updates.title = String(req.body.title);
  if (req.body.department != null) updates.department = String(req.body.department);
  if (req.body.location != null) updates.location = String(req.body.location);
  if (req.body.status != null) updates.status = String(req.body.status);

  const { data, error } = await supabase
    .from("vacancies")
    .update(updates)
    .eq("id", req.params.id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error || !data) { res.status(404).json({ error: "Вакансия не найдена." }); return; }
  const { user_id, created_at, ...clean } = data;
  res.json({ data: clean });
});

app.delete("/vacancies/:id", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  await supabase.from("matches").delete().eq("user_id", userId).eq("vacancy_id", req.params.id);
  await supabase.from("vacancies").delete().eq("id", req.params.id).eq("user_id", userId);
  res.json({ success: true });
});

// ---- Candidates ----

app.get("/candidates", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const { data } = await supabase.from("candidates").select("*").eq("user_id", userId);
  const candidates = (data ?? []).map(({ user_id, created_at, ...rest }) => rest);
  res.json({ data: candidates });
});

app.post("/candidates", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  if (FEATURE_TARIFFS && !isAdmin(req)) {
    const sub = await ensureSubscription(userId);
    if (sub && sub.plan.limit_candidates !== -1) {
      const { count } = await supabase.from("candidates").select("id", { count: "exact", head: true }).eq("user_id", userId);
      if ((count ?? 0) >= sub.plan.limit_candidates) {
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
  const { data, error } = await supabase.from("candidates").insert(newCandidate).select().single();
  if (error) { res.status(500).json({ error: error.message }); return; }
  const { user_id, created_at, ...clean } = data;
  res.json({ data: clean });
});

app.put("/candidates/:id", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const updates: Record<string, any> = {};
  if (req.body.name != null) updates.name = String(req.body.name);
  if (req.body.role != null) updates.role = String(req.body.role);
  if (req.body.stage != null) updates.stage = String(req.body.stage);
  if (Array.isArray(req.body.skills)) updates.skills = req.body.skills;

  const { data, error } = await supabase
    .from("candidates")
    .update(updates)
    .eq("id", req.params.id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error || !data) { res.status(404).json({ error: "Кандидат не найден." }); return; }
  const { user_id, created_at, ...clean } = data;
  res.json({ data: clean });
});

app.delete("/candidates/:id", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  await supabase.from("matches").delete().eq("user_id", userId).eq("candidate_id", req.params.id);
  await supabase.from("calendar_events").delete().eq("user_id", userId).eq("candidate_id", req.params.id);
  await supabase.from("candidates").delete().eq("id", req.params.id).eq("user_id", userId);
  res.json({ success: true });
});

// ---- Matches ----

app.get("/matches", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const { data } = await supabase.from("matches").select("*").eq("user_id", userId);
  const matches = (data ?? []).map((row) => ({
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
  const { data, error } = await supabase.from("matches").insert(newMatch).select().single();
  if (error) { res.status(500).json({ error: error.message }); return; }
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
  await supabase.from("matches").delete().eq("user_id", userId).eq("candidate_id", req.params.candidateId);
  res.json({ success: true });
});

// ---- Calendar ----

app.get("/calendar", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const { data } = await supabase.from("calendar_events").select("*").eq("user_id", userId);
  const events = (data ?? []).map(({ user_id, created_at, ...rest }) => ({
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
  const { data, error } = await supabase.from("calendar_events").insert(newEvent).select().single();
  if (error) { res.status(500).json({ error: error.message }); return; }
  const { user_id, created_at, candidate_id, ...clean } = data;
  res.json({ data: { ...clean, candidateId: candidate_id } });
});

app.delete("/calendar/:id", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  await supabase.from("calendar_events").delete().eq("id", req.params.id).eq("user_id", userId);
  res.json({ success: true });
});

// ---- Communications ----

app.get("/communications", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const { data } = await supabase.from("communications").select("*").eq("user_id", userId);
  const comms = (data ?? []).map(({ user_id, created_at, ...rest }) => rest);
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
  const { data, error } = await supabase.from("communications").insert(newComm).select().single();
  if (error) { res.status(500).json({ error: error.message }); return; }
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

  const { data, error } = await supabase
    .from("communications")
    .update(updates)
    .eq("id", req.params.id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error || !data) { res.status(404).json({ error: "Коммуникация не найдена." }); return; }
  const { user_id, created_at, ...clean } = data;
  res.json({ data: clean });
});

app.delete("/communications/:id", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  await supabase.from("communications").delete().eq("id", req.params.id).eq("user_id", userId);
  res.json({ success: true });
});

// ---- Support Chat ----

app.get("/support/messages", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const { data } = await supabase
    .from("support_messages")
    .select("*")
    .eq("user_id", userId)
    .order("timestamp", { ascending: true });
  const messages = (data ?? []).map(({ user_id, ...rest }) => rest);
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
  const { error: errUser } = await supabase.from("support_messages").insert(userMsg);
  if (errUser) { res.status(500).json({ error: errUser.message }); return; }

  const botReply = getBotResponse(content);
  const botMsg = {
    id: `msg-${Date.now()}-bot`,
    user_id: userId,
    content: botReply,
    sender: "support" as const,
    timestamp: new Date().toISOString()
  };
  const { error: errBot } = await supabase.from("support_messages").insert(botMsg);
  if (errBot) { res.status(500).json({ error: errBot.message }); return; }

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

  const { data: users } = await supabase.from("users").select("*").neq("email", "admin@crm.ru");

  const chats = await Promise.all(
    (users ?? []).map(async (user: User) => {
      const { data: messages } = await supabase
        .from("support_messages")
        .select("*")
        .eq("user_id", user.id)
        .order("timestamp", { ascending: true });

      const msgs = (messages ?? []).map(({ user_id, ...rest }) => rest);
      return {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        messages: msgs,
        lastMessage: msgs[msgs.length - 1]
      };
    })
  );

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
  const { error } = await supabase.from("support_messages").insert(newMsg);
  if (error) { res.status(500).json({ error: error.message }); return; }
  const { user_id, ...clean } = newMsg;
  res.json({ data: clean });
});

// ---- Auth ----

const FEATURE_EMAIL_VERIFICATION = process.env.FEATURE_EMAIL_VERIFICATION === "true";
const FEATURE_TARIFFS = process.env.FEATURE_TARIFFS === "true";
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const BACKEND_URL = process.env.BACKEND_URL ?? process.env.APP_URL ?? "http://localhost:4000";

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
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*, plan:plans(*)")
    .eq("user_id", userId)
    .limit(1)
    .single();
  if (!sub?.plan) return null;
  return {
    subscription: {
      status: sub.status,
      trial_ends_at: sub.trial_ends_at,
      current_period_ends_at: sub.current_period_ends_at
    },
    plan: sub.plan as Plan
  };
}

async function ensureSubscription(userId: string): Promise<SubscriptionWithPlan | null> {
  let sub = await getSubscription(userId);
  if (sub) return sub;
  const { data: starterPlan } = await supabase.from("plans").select("id").eq("slug", "starter").limit(1).single();
  if (!starterPlan) {
    const { data: freePlan } = await supabase.from("plans").select("id").eq("slug", "free").limit(1).single();
    if (!freePlan) return null;
    const trialEnds = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("subscriptions").insert({
      user_id: userId,
      plan_id: freePlan.id,
      status: "trial",
      trial_ends_at: trialEnds,
      current_period_ends_at: trialEnds
    });
    return getSubscription(userId);
  }
  const trialEnds = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  await supabase.from("subscriptions").insert({
    user_id: userId,
    plan_id: starterPlan.id,
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

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", normalizedEmail)
    .limit(1);

  if (existing && existing.length > 0) {
    res.status(409).json({ error: "Пользователь уже зарегистрирован." });
    return;
  }

  const { data: allUsers } = await supabase.from("users").select("id");
  const newUser: User = {
    id: `usr-${(allUsers?.length ?? 0) + 1}`,
    name: String(name).trim(),
    email: normalizedEmail,
    password: String(password)
  };

  const { error } = await supabase.from("users").insert(newUser);
  if (error) { res.status(500).json({ error: error.message }); return; }

  let planId: string | null = null;
  const { data: starterPlan } = await supabase.from("plans").select("id").eq("slug", "starter").limit(1).single();
  if (starterPlan) planId = starterPlan.id;
  else {
    const { data: freePlan } = await supabase.from("plans").select("id").eq("slug", "free").limit(1).single();
    if (freePlan) planId = freePlan.id;
  }
  if (planId) {
    const trialEnds = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("subscriptions").insert({
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
    await supabase.from("verification_tokens").insert({
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
  const { data: row } = await supabase
    .from("verification_tokens")
    .select("user_id")
    .eq("token", token)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .single();

  if (!row) {
    return res.redirect(`${APP_URL}/login?error=invalid_or_expired`);
  }

  await supabase
    .from("verification_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("token", token);
  await supabase
    .from("users")
    .update({ email_verified_at: new Date().toISOString() })
    .eq("id", row.user_id);

  res.redirect(`${APP_URL}/login?verified=1`);
});

app.post("/auth/verify-code", async (req, res) => {
  const { email, code } = req.body ?? {};
  const normalizedEmail = String(email ?? "").trim().toLowerCase();
  const codeStr = String(code ?? "").trim().replace(/\D/g, "");
  if (!normalizedEmail || codeStr.length !== 6) {
    return res.status(400).json({ error: "Укажите email и 6-значный код из письма." });
  }
  const { data: user } = await supabase.from("users").select("id").eq("email", normalizedEmail).limit(1).single();
  if (!user) {
    return res.status(404).json({ error: "Пользователь не найден." });
  }
  const { data: row } = await supabase
    .from("verification_tokens")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("code", codeStr)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .single();
  if (!row) {
    return res.status(400).json({ error: "Код неверный или истёк. Запросите новое письмо, зарегистрировавшись снова." });
  }
  await supabase.from("verification_tokens").update({ used_at: new Date().toISOString() }).eq("user_id", user.id).eq("code", codeStr);
  await supabase.from("users").update({ email_verified_at: new Date().toISOString() }).eq("id", user.id);
  return res.json({ success: true, message: "Email подтверждён. Войдите в систему." });
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ error: "Введите email и пароль." });
    return;
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const { data: users } = await supabase
    .from("users")
    .select("*")
    .eq("email", normalizedEmail)
    .eq("password", String(password))
    .limit(1);

  const user = users?.[0] as User | undefined;
  if (!user) {
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
  const { data, error } = await supabase
    .from("integrations")
    .select("service, status, last_sync_at")
    .eq("user_id", userId);
  const byService = new Map((data ?? []).map((r: any) => [r.service, r]));
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
  const { error } = await supabase.from("integrations").upsert(
    {
      user_id: userId,
      service,
      api_key_encrypted: apiKey,
      status: "connected"
    },
    { onConflict: "user_id,service" }
  );
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ data: { service, status: "connected" } });
});

app.delete("/integrations/:service", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const service = String(req.params.service ?? "").toLowerCase().replace(/[^a-z0-9_]/g, "_");
  await supabase.from("integrations").delete().eq("user_id", userId).eq("service", service);
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

  const { data: integration } = await supabase
    .from("integrations")
    .select("id")
    .eq("user_id", userId)
    .eq("service", service)
    .eq("status", "connected")
    .single();

  if (!integration) {
    res.status(400).json({ error: "Сначала подключите интеграцию и укажите API ключ." });
    return;
  }

  await supabase
    .from("integrations")
    .update({ status: "syncing" })
    .eq("user_id", userId)
    .eq("service", service);

  try {
    const vacancies = getMockVacanciesForService(service);
    const candidates = getMockCandidatesForService(service);

    for (const v of vacancies) {
      await supabase.from("vacancies").insert({
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
      await supabase.from("candidates").insert({
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
    await supabase
      .from("integrations")
      .update({ status: "connected", last_sync_at: now })
      .eq("user_id", userId)
      .eq("service", service);

    res.json({
      data: {
        service,
        status: "connected",
        lastSyncAt: now,
        imported: { vacancies: vacancies.length, candidates: candidates.length }
      }
    });
  } catch (err) {
    await supabase
      .from("integrations")
      .update({ status: "error" })
      .eq("user_id", userId)
      .eq("service", service);
    res.status(500).json({
      error: "Ошибка синхронизации",
      details: err instanceof Error ? err.message : String(err)
    });
  }
});

// ---- AI Matching ----

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
    const [vacRes, candRes] = await Promise.all([
      supabase.from("vacancies").select("*").eq("id", vacancy_id).eq("user_id", userId).single(),
      supabase.from("candidates").select("*").eq("user_id", userId)
    ]);

    const vacancy = vacRes.data;
    const candidates = candRes.data ?? [];
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
      await supabase.from("matches").delete().eq("user_id", userId).eq("vacancy_id", vacancy_id);

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
        await supabase.from("matches").insert(newMatches);
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
    const [vacRes, candRes] = await Promise.all([
      supabase.from("vacancies").select("*").eq("id", vacancy_id).eq("user_id", userId).single(),
      supabase.from("candidates").select("*").eq("id", candidate_id).eq("user_id", userId).single()
    ]);

    const vacancy = vacRes.data;
    const candidate = candRes.data;
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

app.listen(port, () => {
  console.log(`Найми backend: http://localhost:${port}`);
  if (isProduction) {
    console.log(`Фронтенд отдаётся с этого же сервера (${APP_ORIGIN})`);
  }
});
