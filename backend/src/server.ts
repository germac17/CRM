import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { promises as fs } from "fs";
import path from "path";
 
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
  title: string;
  department: string;
  location: string;
  status: string;
};

type Candidate = {
  id: string;
  name: string;
  role: string;
  skills: string[];
  stage: string;
};

type Match = {
  candidateId: string;
  score: number;
  explanation: string;
  vacancyId: string;
};

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  participants: string;
  status: string;
  candidateId?: string;
};

const dataDir = path.resolve(process.cwd(), "data");
const usersFile = path.join(dataDir, "users.json");

const getUserDataFile = (userId: string, type: string) =>
  path.join(dataDir, `user-${userId}-${type}.json`);
 
const loadUsers = async (): Promise<User[]> => {
  try {
    const raw = await fs.readFile(usersFile, "utf-8");
    return JSON.parse(raw) as User[];
  } catch {
    return [];
  }
};
 
const saveUsers = async (users: User[]) => {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(usersFile, JSON.stringify(users, null, 2), "utf-8");
};

const loadUserData = async <T>(userId: string, type: string): Promise<T[]> => {
  try {
    const filePath = getUserDataFile(userId, type);
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
};

const saveUserData = async <T>(userId: string, type: string, data: T[]) => {
  await fs.mkdir(dataDir, { recursive: true });
  const filePath = getUserDataFile(userId, type);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
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
 
const ensureAdminUser = async () => {
  const users = await loadUsers();
  const adminEmail = "admin@crm.ru";
  const hasAdmin = users.some((user) => user.email === adminEmail);
  if (!hasAdmin) {
    users.push({
      id: "usr-admin",
      name: "Администратор",
      email: adminEmail,
      password: "admin"
    });
    await saveUsers(users);
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

  const users = await loadUsers();
  const user = users.find((item) => item.email === email);
  if (!user) {
    res.status(401).json({ error: "Пользователь не найден." });
    return;
  }

  (req as any).userId = user.id;
  (req as any).userEmail = user.email;
  next();
};

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "hr-crm-backend" });
});

app.get("/vacancies", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const vacancies = await loadUserData<Vacancy>(userId, "vacancies");
  res.json({ data: vacancies });
});

app.get("/candidates", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const candidates = await loadUserData<Candidate>(userId, "candidates");
  res.json({ data: candidates });
});

app.get("/matches", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const matches = await loadUserData<Match>(userId, "matches");
  res.json({ data: matches });
});

app.post("/vacancies", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const vacancies = await loadUserData<Vacancy>(userId, "vacancies");
  const newVacancy = {
    id: `vac-${Date.now()}`,
    title: String(req.body.title ?? ""),
    department: String(req.body.department ?? ""),
    location: String(req.body.location ?? ""),
    status: String(req.body.status ?? "open")
  };
  vacancies.push(newVacancy);
  await saveUserData(userId, "vacancies", vacancies);
  res.json({ data: newVacancy });
});

app.put("/vacancies/:id", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const vacancies = await loadUserData<Vacancy>(userId, "vacancies");
  const index = vacancies.findIndex((item) => item.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: "Вакансия не найдена." });
    return;
  }
  vacancies[index] = {
    ...vacancies[index],
    title: String(req.body.title ?? vacancies[index].title),
    department: String(req.body.department ?? vacancies[index].department),
    location: String(req.body.location ?? vacancies[index].location),
    status: String(req.body.status ?? vacancies[index].status)
  };
  await saveUserData(userId, "vacancies", vacancies);
  res.json({ data: vacancies[index] });
});

app.delete("/vacancies/:id", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const vacancies = await loadUserData<Vacancy>(userId, "vacancies");
  const filtered = vacancies.filter((item) => item.id !== req.params.id);
  await saveUserData(userId, "vacancies", filtered);
  res.json({ success: true });
});

app.post("/candidates", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const candidates = await loadUserData<Candidate>(userId, "candidates");
  const newCandidate = {
    id: `cand-${Date.now()}`,
    name: String(req.body.name ?? ""),
    role: String(req.body.role ?? ""),
    skills: Array.isArray(req.body.skills) ? req.body.skills : [],
    stage: String(req.body.stage ?? "Скрининг")
  };
  candidates.push(newCandidate);
  await saveUserData(userId, "candidates", candidates);
  res.json({ data: newCandidate });
});

app.put("/candidates/:id", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const candidates = await loadUserData<Candidate>(userId, "candidates");
  const index = candidates.findIndex((item) => item.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: "Кандидат не найден." });
    return;
  }
  candidates[index] = {
    ...candidates[index],
    name: String(req.body.name ?? candidates[index].name),
    role: String(req.body.role ?? candidates[index].role),
    stage: String(req.body.stage ?? candidates[index].stage),
    skills: Array.isArray(req.body.skills)
      ? req.body.skills
      : candidates[index].skills
  };
  await saveUserData(userId, "candidates", candidates);
  res.json({ data: candidates[index] });
});

app.delete("/candidates/:id", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const candidates = await loadUserData<Candidate>(userId, "candidates");
  const filtered = candidates.filter((item) => item.id !== req.params.id);
  await saveUserData(userId, "candidates", filtered);
  res.json({ success: true });
});

app.post("/matches", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const matches = await loadUserData<Match>(userId, "matches");
  const newMatch = {
    candidateId: String(req.body.candidateId ?? ""),
    score: Number(req.body.score ?? 0),
    explanation: String(req.body.explanation ?? ""),
    vacancyId: String(req.body.vacancyId ?? "")
  };
  matches.push(newMatch);
  await saveUserData(userId, "matches", matches);
  res.json({ data: newMatch });
});

app.delete("/matches/:candidateId", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const matches = await loadUserData<Match>(userId, "matches");
  const filtered = matches.filter(
    (item) => item.candidateId !== req.params.candidateId
  );
  await saveUserData(userId, "matches", filtered);
  res.json({ success: true });
});

app.get("/calendar", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const events = await loadUserData<CalendarEvent>(userId, "calendar");
  res.json({ data: events });
});

app.post("/calendar", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const events = await loadUserData<CalendarEvent>(userId, "calendar");
  const newEvent = {
    id: `event-${Date.now()}`,
    title: String(req.body.title ?? ""),
    date: String(req.body.date ?? ""),
    time: String(req.body.time ?? ""),
    participants: String(req.body.participants ?? ""),
    status: String(req.body.status ?? "Запланировано"),
    candidateId: req.body.candidateId ? String(req.body.candidateId) : undefined
  };
  events.push(newEvent);
  await saveUserData(userId, "calendar", events);
  res.json({ data: newEvent });
});

app.delete("/calendar/:id", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const events = await loadUserData<CalendarEvent>(userId, "calendar");
  const filtered = events.filter((item) => item.id !== req.params.id);
  await saveUserData(userId, "calendar", filtered);
  res.json({ success: true });
});

app.post("/auth/register", async (req, res) => {
  const { name, email, password } = req.body ?? {};
  if (!name || !email || !password) {
    res.status(400).json({ error: "Заполните имя, email и пароль." });
    return;
  }
 
  const users = await loadUsers();
  const normalizedEmail = String(email).trim().toLowerCase();
  const exists = users.some((user) => user.email === normalizedEmail);
  if (exists) {
    res.status(409).json({ error: "Пользователь уже зарегистрирован." });
    return;
  }
 
  const newUser: User = {
    id: `usr-${users.length + 1}`,
    name: String(name).trim(),
    email: normalizedEmail,
    password: String(password)
  };
  users.push(newUser);
  await saveUsers(users);
 
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
 
  const users = await loadUsers();
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = users.find(
    (item) => item.email === normalizedEmail && item.password === String(password)
  );
  if (!user) {
    res.status(401).json({ error: "Неверный email или пароль." });
    return;
  }
 
  res.json({
    token: createToken(user.email),
    user: { id: user.id, name: user.name, email: user.email }
  });
});
 
ensureAdminUser()
  .then(() => {
    app.listen(port, () => {
      console.log(`HR CRM backend запущен на http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Не удалось инициализировать администратора", error);
  });
