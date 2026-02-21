import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { supabase } from "./supabase.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

type User = {
  id: string;
  name: string;
  email: string;
  password: string;
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

// ---- Health ----

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "hr-crm-backend", db: "supabase" });
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
  const newMsg = {
    id: `msg-${Date.now()}`,
    user_id: userId,
    content: String(req.body.content ?? ""),
    sender: "user" as const,
    timestamp: new Date().toISOString()
  };
  const { error } = await supabase.from("support_messages").insert(newMsg);
  if (error) { res.status(500).json({ error: error.message }); return; }
  const { user_id, ...clean } = newMsg;
  res.json({ data: [clean] });
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

  res.json({
    token: createToken(newUser.email),
    user: { id: newUser.id, name: newUser.name, email: newUser.email }
  });
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

  res.json({
    token: createToken(user.email),
    user: { id: user.id, name: user.name, email: user.email }
  });
});

// ---- AI Matching ----

app.post("/ai/match/batch", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const { vacancy_id, auto_save } = req.body;

  if (!vacancy_id) {
    res.status(400).json({ error: "Укажите vacancy_id" });
    return;
  }

  const aiServiceUrl = process.env.AI_SERVICE_URL ?? "http://localhost:8001";

  try {
    const aiResponse = await fetch(`${aiServiceUrl}/api/match/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vacancy_id, auto_save: false })
    });

    if (!aiResponse.ok) {
      throw new Error(`AI-сервис вернул ошибку: ${aiResponse.status}`);
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
  const { vacancy_id, candidate_id } = req.body;
  if (!vacancy_id || !candidate_id) {
    res.status(400).json({ error: "Укажите vacancy_id и candidate_id" });
    return;
  }

  const aiServiceUrl = process.env.AI_SERVICE_URL ?? "http://localhost:8001";

  try {
    const aiResponse = await fetch(`${aiServiceUrl}/api/match/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vacancy_id, candidate_id })
    });

    if (!aiResponse.ok) {
      throw new Error(`AI-сервис вернул ошибку: ${aiResponse.status}`);
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

// ---- Start ----

app.listen(port, () => {
  console.log(`HR CRM backend (Supabase) запущен на http://localhost:${port}`);
});
