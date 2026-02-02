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
 
const vacancies = [
  {
    id: "vac-001",
    title: "Старший продакт-менеджер",
    department: "Продукт",
    location: "Удаленно",
    status: "open"
  },
  {
    id: "vac-002",
    title: "Дата-сайентист",
    department: "AI/ML",
    location: "Москва",
    status: "open"
  }
];
 
const candidates = [
  {
    id: "cand-101",
    name: "Elena Morozova",
    role: "Продакт-менеджер",
    skills: ["roadmaps", "growth", "analytics"],
    stage: "Интервью"
  },
  {
    id: "cand-102",
    name: "Maxim Petrov",
    role: "Дата-сайентист",
    skills: ["nlp", "pytorch", "recommenders"],
    stage: "Скрининг"
  }
];
 
type User = {
  id: string;
  name: string;
  email: string;
  password: string;
};
 
const dataDir = path.resolve(process.cwd(), "data");
const usersFile = path.join(dataDir, "users.json");
 
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
 
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "hr-crm-backend" });
});
 
app.get("/vacancies", (_req, res) => {
  res.json({ data: vacancies });
});
 
app.get("/candidates", (_req, res) => {
  res.json({ data: candidates });
});
 
app.get("/matches", (req, res) => {
  const vacancyId = String(req.query.vacancyId ?? "vac-001");
  const matches = [
    {
      candidateId: "cand-101",
      score: 0.92,
      explanation: "Сильный лидер и опыт работы с продуктовыми дорожными картами.",
      vacancyId
    },
    {
      candidateId: "cand-102",
      score: 0.88,
      explanation: "Высокое соответствие ML и смежные навыки.",
      vacancyId
    }
  ];
 
  res.json({ data: matches });
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
