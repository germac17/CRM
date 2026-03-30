import { useEffect, useMemo, useState, type FormEvent } from "react";
 
type Vacancy = {
  id: string;
  title: string;
  department: string;
  location: string;
  status: string;
  details?: Record<string, unknown>;
};
 
type Candidate = {
  id: string;
  name: string;
  role: string;
  skills: string[];
  stage: string;
  source?: string;
  notes?: string;
};
 
type Match = {
  candidateId: string;
  score: number;
  explanation: string;
  vacancyId: string;
  category?: string;
  details?: {
    skills_match?: {
      matched: number;
      required: number;
      score: number;
    };
    semantic_similarity?: number;
    experience_match?: number;
    education_match?: boolean;
    nice_to_have_bonus?: number;
  };
  confidence?: number;
  needs_review?: boolean;
};

type AIMatchResult = {
  candidate_id: string;
  vacancy_id: string;
  score: number;
  category: string;
  explanation: string;
  details: {
    skills_match: {
      matched: number;
      required: number;
      missing: string[];
      score: number;
    };
    semantic_similarity: number;
    experience_match: number;
    education_match: boolean;
    nice_to_have_bonus: number;
  };
  confidence: number;
  needs_review: boolean;
};
 
type AuthUser = {
  id: string;
  name: string;
  email: string;
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

type Communication = {
  id: string;
  channel: string;
  template: string;
  audience: string;
  status: string;
};

type SupportMessage = {
  id: string;
  content: string;
  sender: "user" | "support";
  timestamp: string;
};

type SupportChat = {
  userId: string;
  userName: string;
  userEmail: string;
  messages: SupportMessage[];
  lastMessage?: SupportMessage;
};
 
const stageOrder = ["Отклик", "Поиск", "Скрининг", "Интервью", "Оффер", "Найм"];

const tabs = [
  { id: "dashboard", label: "Дашборд" },
  { id: "vacancies", label: "Вакансии" },
  { id: "candidates", label: "Кандидаты" },
  { id: "communications", label: "Коммуникации" },
  { id: "calendar", label: "Календарь" },
  { id: "matching", label: "ИИ матчинг" },
  { id: "analytics", label: "Аналитика" },
  { id: "integrations", label: "Интеграции" },
  { id: "tariff", label: "Тариф и оплата" },
  { id: "admin", label: "Администрирование" }
];
 
const getTabFromHash = () => {
  if (typeof window === "undefined") {
    return "dashboard";
  }
  const hash = window.location.hash.replace(/^#/, "");
  const params = new URLSearchParams(hash);
  const tab = params.get("tab");
  return tabs.some((item) => item.id === tab) ? tab ?? "dashboard" : "dashboard";
};

const extractTimestampFromId = (id: string): number | null => {
  const match = id.match(/(\d{10,})/);
  if (!match) return null;
  const ts = Number(match[1]);
  return Number.isFinite(ts) ? ts : null;
};

const getInitials = (value: string): string => {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "--";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
};

function getVercelMissingApiMessage(): string | null {
  if (import.meta.env.DEV) return null;
  const fromEnv = (import.meta.env.VITE_API_URL || "").trim();
  if (fromEnv) return null;
  if (typeof window === "undefined") return null;
  const host = window.location.hostname;
  const onVercelRuntime =
    host.endsWith(".vercel.app") ||
    host === "vercel.app" ||
    import.meta.env.VITE_VERCEL === true;
  if (!import.meta.env.PROD || !onVercelRuntime) return null;
  return [
    "При сборке не был указан URL бэкенда (переменная VITE_API_URL).",
    "",
    "1) Разверните API из папки backend на любом хосте с HTTPS и публичным адресом (VPS, Railway, Render и т.д.).",
    "",
    "2) В Vercel: Project → Settings → Environment Variables → Add:",
    "   • Name: VITE_API_URL",
    "   • Value: https://ваш-api-домен (без / в конце)",
    "   • Environments: выберите Production и при необходимости Preview (если деплой по ветке).",
    "",
    "3) Deployments → последний деплой → … → Redeploy. Без пересборки сборка не увидит переменную.",
    "",
    "Если переменная уже есть — проверьте имя (ровно VITE_API_URL) и Redeploy."
  ].join("\n");
}

function getApiBase(): string {
  const fromEnv = (import.meta.env.VITE_API_URL || "").trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (import.meta.env.DEV) return "http://localhost:4000";
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:4000";
}

async function readJsonRes(res: Response): Promise<unknown> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(`Пустой ответ сервера (HTTP ${res.status}).`);
  }
  const looksJson = trimmed.startsWith("{") || trimmed.startsWith("[");
  if (!looksJson) {
    const preview = trimmed.replace(/\s+/g, " ").slice(0, 140);
    const hint =
      preview.includes("The page") || preview.startsWith("<!") || preview.startsWith("<")
        ? " Укажите VITE_API_URL на URL бэкенда в переменных окружения Vercel."
        : "";
    throw new Error(`Ожидался JSON, получено: ${preview}…${hint}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Некорректный JSON (HTTP ${res.status}).`);
  }
}

const DEFAULT_VACANCY_FORM = {
  title: "",
  department: "",
  location: "",
  level: "Middle",
  status: "open",
  employeeType: "permanent" as "permanent" | "temporary",
  employmentType: "full" as "full" | "part" | "shift",
  workFormat: [] as string[],
  laborContract: false,
  internship: false,
  gph: false,
  gphSelfEmployed: false,
  gphIE: false,
  gphIndividual: false,
  schedule: [] as string[],
  scheduleHoursPerDay: [] as string[],
  nightShifts: false,
  publicationCities: [] as string[],
  workAddress: "",
  salaryFrom: "",
  salaryTo: "",
  salaryCurrency: "RUB",
  salaryPeriod: "month",
  salaryTax: "gross" as "gross" | "net",
  paymentFrequency: "",
  description: "",
  skills: [] as string[],
  cityInput: ""
};
 
 
 
type Integration = {
  service: string;
  status: string;
  lastSyncAt: string | null;
  hasKey: boolean;
};

const INTEGRATION_LABELS: Record<string, string> = {
  hh_ru: "HH.ru",
  linkedin: "LinkedIn",
  google_workspace: "Google Workspace",
  outlook: "Outlook",
  slack: "Slack"
};
 
const adminControls = [
  {
    title: "RBAC роли",
    description: "Рекрутер, HR менеджер, руководитель, администратор",
    status: "Настроено"
  },
  {
    title: "Аудит действий",
    description: "Логи доступа и изменения данных",
    status: "Активно"
  },
  {
    title: "GDPR и безопасность",
    description: "Шифрование, согласия, хранение данных",
    status: "В работе"
  }
];
 
const analyticsWidgets = [
  { id: "kpis", label: "KPI карточки" },
  { id: "pipeline", label: "Воронка найма" },
  { id: "sources", label: "Источники кандидатов" },
  { id: "time", label: "Сроки закрытия" },
  { id: "conversion", label: "Конверсия этапов" }
];
 
export default function App() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(() => getTabFromHash());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: ""
  });
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [calendarFilter, setCalendarFilter] = useState("Все");
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: "",
    date: "",
    time: "",
    participants: "",
    status: "Запланировано",
    candidateId: ""
  });
  const [showCommModal, setShowCommModal] = useState(false);
  const [editingCommId, setEditingCommId] = useState<string | null>(null);
  const [commForm, setCommForm] = useState({
    channel: "Email",
    template: "",
    audience: "",
    status: "Запланировано"
  });
  const [matchingForm, setMatchingForm] = useState({
    candidateId: "",
    score: "0.8",
    explanation: ""
  });
  const [selectedVacancyForMatching, setSelectedVacancyForMatching] = useState<string>("");
  const [aiMatchingLoading, setAiMatchingLoading] = useState(false);
  const [aiMatchingError, setAiMatchingError] = useState<string | null>(null);
  const [aiMatches, setAiMatches] = useState<AIMatchResult[]>([]);
  const [aiServiceAvailable, setAiServiceAvailable] = useState<boolean | null>(null);
  const [showAIMatchDetails, setShowAIMatchDetails] = useState<string | null>(null);
  const [showFullReport, setShowFullReport] = useState(false);
  const [reportFilter, setReportFilter] = useState<"all" | "suitable" | "conditional" | "unsuitable">("all");
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(
    null
  );
  const [analyticsFilters, setAnalyticsFilters] = useState({
    department: "Все отделы",
    range: "Последние 30 дней"
  });
  const [enabledWidgets, setEnabledWidgets] = useState<string[]>(
    analyticsWidgets.map((widget) => widget.id)
  );
  const [showSupportChat, setShowSupportChat] = useState(false);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [supportInput, setSupportInput] = useState("");
  const [supportLoading, setSupportLoading] = useState(false);
  const [adminChats, setAdminChats] = useState<SupportChat[]>([]);
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null);
  const [adminReplyInput, setAdminReplyInput] = useState("");
  const [showVacancyModal, setShowVacancyModal] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [vacancyForm, setVacancyForm] = useState({ ...DEFAULT_VACANCY_FORM });
  const [editingVacancyId, setEditingVacancyId] = useState<string | null>(
    null
  );
  const [candidateForm, setCandidateForm] = useState({
    name: "",
    role: "",
    stage: "Отклик",
    source: "",
    notes: ""
  });
  const [candidateListQuery, setCandidateListQuery] = useState("");
  const [candidateListStage, setCandidateListStage] = useState<string>("Все");
  const [integrationsList, setIntegrationsList] = useState<Integration[]>([]);
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  const [selectedIntegrationService, setSelectedIntegrationService] = useState<string | null>(null);
  const [integrationApiKey, setIntegrationApiKey] = useState("");
  const [integrationSyncLoading, setIntegrationSyncLoading] = useState<string | null>(null);
  const [integrationConnectLoading, setIntegrationConnectLoading] = useState(false);
  const [plans, setPlans] = useState<Array<{
    id: string;
    name: string;
    slug: string;
    price_monthly: number;
    price_yearly: number | null;
    limit_vacancies: number | string;
    limit_candidates: number | string;
    ai_matching_enabled: boolean;
    limit_users: number;
    priority_support: boolean;
    integrations_allowed: string[];
  }>>([]);
  const [subscription, setSubscription] = useState<{
    subscription: { status: string; trial_ends_at: string | null; current_period_ends_at: string };
    plan: { name: string; slug: string; price_monthly: number; limit_vacancies: number | string; limit_candidates: number | string; ai_matching_enabled: boolean };
  } | null>(null);

  const [apiConfigError] = useState<string | null>(() => getVercelMissingApiMessage());
 
  useEffect(() => {
    if (apiConfigError) {
      setLoading(false);
      return;
    }
    if (!token) {
      setLoading(false);
      return;
    }

    const apiBase = getApiBase();

    const load = async () => {
      setLoading(true);
      try {
        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        };

        const [vacancyRes, candidateRes, matchRes, calendarRes, commRes, supportRes, integrationsRes] = await Promise.all([
          fetch(`${apiBase}/vacancies`, { headers }),
          fetch(`${apiBase}/candidates`, { headers }),
          fetch(`${apiBase}/matches`, { headers }),
          fetch(`${apiBase}/calendar`, { headers }),
          fetch(`${apiBase}/communications`, { headers }),
          fetch(`${apiBase}/support/messages`, { headers }),
          fetch(`${apiBase}/integrations`, { headers })
        ]);

        const coreResponses = [vacancyRes, candidateRes, matchRes, calendarRes, commRes, supportRes];
        if (coreResponses.some((r) => r.status === 401)) {
          setToken(null);
          setCurrentUser(null);
          localStorage.removeItem("naymi_token");
          localStorage.removeItem("naymi_user");
          setError("Сессия истекла или пользователь удалён. Войдите снова.");
          setLoading(false);
          return;
        }

        if (coreResponses.some((r) => !r.ok)) {
          throw new Error("API недоступен.");
        }
        const vacancyJson = (await readJsonRes(vacancyRes)) as { data: Vacancy[] };
        const candidateJson = (await readJsonRes(candidateRes)) as {
          data: Candidate[];
        };
        const matchJson = (await readJsonRes(matchRes)) as { data: Match[] };
        const calendarJson = (await readJsonRes(calendarRes)) as { data: CalendarEvent[] };
        const commJson = (await readJsonRes(commRes)) as { data: Communication[] };
        const supportJson = (await readJsonRes(supportRes)) as { data: SupportMessage[] };
        const integrationsFallback: Integration[] = ["hh_ru", "linkedin", "google_workspace", "outlook", "slack"].map((s) => ({
          service: s,
          status: "disconnected",
          lastSyncAt: null,
          hasKey: false
        }));
        const integrationsJson = integrationsRes.ok
          ? ((await readJsonRes(integrationsRes)) as { data: Integration[] })
          : { data: integrationsFallback };

        setVacancies(vacancyJson.data);
        setCandidates(candidateJson.data);
        setMatches(matchJson.data);
        setCalendarEvents(calendarJson.data);
        setCommunications(commJson.data);
        setSupportMessages(supportJson.data);
        setIntegrationsList(integrationsJson.data);
        setError(null);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Не удалось загрузить данные.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token, apiConfigError]);
 
  useEffect(() => {
    const savedToken = localStorage.getItem("naymi_token");
    const savedUser = localStorage.getItem("naymi_user");
    if (savedToken) {
      setToken(savedToken);
    }
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser) as AuthUser);
      } catch {
        setCurrentUser(null);
      }
    }
  }, []);

  useEffect(() => {
    if (token) return;
    const params = new URLSearchParams(window.location.search);
    const verified = params.get("verified");
    const err = params.get("error");
    if (verified === "1") {
      setAuthSuccess("Email подтверждён. Войдите в систему.");
      window.history.replaceState({}, "", window.location.pathname + window.location.hash);
    }
    if (err === "invalid_or_expired") {
      setAuthError("Ссылка подтверждения недействительна или истекла.");
      window.history.replaceState({}, "", window.location.pathname + window.location.hash);
    }
    if (err === "missing_token") {
      setAuthError("Не указан токен подтверждения.");
      window.history.replaceState({}, "", window.location.pathname + window.location.hash);
    }
  }, [token]);
 
 
  useEffect(() => {
    const handleHashChange = () => {
      setActiveTab(getTabFromHash());
    };
 
    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);
 
  const dashboardMonthBuckets = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("ru-RU", { month: "short" });
    const now = new Date();
    return Array.from({ length: 6 }).map((_, idx) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
      const start = new Date(date.getFullYear(), date.getMonth(), 1).getTime();
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime();
      const label = formatter.format(date).replace(".", "");
      return { start, end, label };
    });
  }, []);

  const dashboardTrend = useMemo(() => {
    const candidatesSeries = dashboardMonthBuckets.map(() => 0);
    const hiredSeries = dashboardMonthBuckets.map(() => 0);

    const hiredPattern = /найм|нанят|оффер|принят/i;

    candidates.forEach((candidate) => {
      const ts = extractTimestampFromId(candidate.id);
      if (!ts) return;
      const idx = dashboardMonthBuckets.findIndex((bucket) => ts >= bucket.start && ts < bucket.end);
      if (idx === -1) return;
      candidatesSeries[idx] += 1;
      if (hiredPattern.test(candidate.stage)) {
        hiredSeries[idx] += 1;
      }
    });

    return {
      labels: dashboardMonthBuckets.map((b) => b.label),
      candidatesSeries,
      hiredSeries
    };
  }, [dashboardMonthBuckets, candidates]);

  const dashboardKpis = useMemo(() => {
    const activeCandidates = candidates.filter((candidate) => !/отказ|reject/i.test(candidate.stage)).length;
    const fallbackStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    const fallbackEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).getTime();
    const currentMonth = dashboardMonthBuckets[dashboardMonthBuckets.length - 1] ?? {
      start: fallbackStart,
      end: fallbackEnd
    };
    const hiredPattern = /найм|нанят|оффер|принят/i;

    const createdThisMonth = candidates.filter((candidate) => {
      const ts = extractTimestampFromId(candidate.id);
      return ts != null && ts >= currentMonth.start && ts < currentMonth.end;
    });

    const hiredThisMonth = createdThisMonth.filter((candidate) => hiredPattern.test(candidate.stage)).length;

    const avgHireDays = (() => {
      const now = Date.now();
      const completed = calendarEvents.filter((event) =>
        /оффер|найм|принят|заверш/i.test(`${event.title} ${event.status}`)
      );
      if (completed.length === 0) return "—";
      const avg = completed.reduce((sum, event) => {
        const eventTs = new Date(`${event.date}T00:00:00`).getTime();
        const days = Math.max(0, (now - eventTs) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0) / completed.length;
      return `${Math.round(avg)} дн`;
    })();

    return [
      { label: "Активные кандидаты", value: String(activeCandidates) },
      { label: "Нанято в этом месяце", value: String(hiredThisMonth) },
      { label: "Новые заявки", value: String(createdThisMonth.length) },
      { label: "Среднее время найма", value: avgHireDays }
    ];
  }, [candidates, dashboardMonthBuckets, calendarEvents]);

  const latestCandidates = useMemo(() => {
    return [...candidates]
      .sort((a, b) => (extractTimestampFromId(b.id) ?? 0) - (extractTimestampFromId(a.id) ?? 0))
      .slice(0, 5);
  }, [candidates]);

  const candidatesForTab = useMemo(() => {
    let list = candidates;
    if (candidateListStage !== "Все") {
      list = list.filter((c) => c.stage === candidateListStage);
    }
    const q = candidateListQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.role.toLowerCase().includes(q) ||
          (c.source && c.source.toLowerCase().includes(q))
      );
    }
    return [...list].sort(
      (a, b) => (extractTimestampFromId(b.id) ?? 0) - (extractTimestampFromId(a.id) ?? 0)
    );
  }, [candidates, candidateListQuery, candidateListStage]);

  const funnelStageCounts = useMemo(() => {
    const m = new Map<string, number>();
    stageOrder.forEach((s) => m.set(s, 0));
    candidates.forEach((c) => {
      if (m.has(c.stage)) m.set(c.stage, (m.get(c.stage) ?? 0) + 1);
    });
    return stageOrder.map((s) => ({ stage: s, count: m.get(s) ?? 0 }));
  }, [candidates]);

  const departmentOptions = useMemo(() => {
    const deps = new Set(vacancies.map((v) => v.department).filter(Boolean));
    return ["Все отделы", ...Array.from(deps).sort()];
  }, [vacancies]);

  const filteredVacancies = useMemo(() => {
    if (analyticsFilters.department === "Все отделы") return vacancies;
    return vacancies.filter((v) => v.department === analyticsFilters.department);
  }, [vacancies, analyticsFilters.department]);

  const filteredCandidates = useMemo(() => {
    if (analyticsFilters.department === "Все отделы") return candidates;
    const vacancyIds = new Set(filteredVacancies.map((v) => v.id));
    const matchedCandidateIds = new Set(
      matches.filter((m) => vacancyIds.has(m.vacancyId)).map((m) => m.candidateId)
    );
    return candidates.filter((c) => matchedCandidateIds.has(c.id));
  }, [candidates, filteredVacancies, matches, analyticsFilters.department]);

  const analyticsKpis = useMemo(() => {
    const openVacancies = filteredVacancies.filter((v) =>
      v.status.toLowerCase().includes("open")
    ).length;
    const matchedInFiltered = new Set(
      matches.filter((m) =>
        filteredVacancies.some((v) => v.id === m.vacancyId)
      ).map((m) => m.candidateId)
    ).size;
    return [
      { label: "Открытые вакансии", value: String(openVacancies) },
      { label: "Кандидаты в воронке", value: String(filteredCandidates.length) },
      { label: "ИИ матчинги", value: String(matchedInFiltered) },
      { label: "Всего вакансий", value: String(filteredVacancies.length) }
    ];
  }, [filteredVacancies, filteredCandidates, matches]);

  const analyticsStages = useMemo(() => {
    const base = new Map<string, number>();
    stageOrder.forEach((stage) => base.set(stage, 0));
    filteredCandidates.forEach((c) => {
      if (base.has(c.stage)) base.set(c.stage, (base.get(c.stage) ?? 0) + 1);
    });
    return Array.from(base.entries()).map(([label, value]) => ({ label, value }));
  }, [filteredCandidates]);

  const analyticsChartData = useMemo(() => {
    const vacByDept = new Map<string, number>();
    filteredVacancies.forEach((v) => {
      vacByDept.set(v.department, (vacByDept.get(v.department) ?? 0) + 1);
    });
    const vacanciesByDept = Array.from(vacByDept.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    const roleCount = new Map<string, number>();
    filteredCandidates.forEach((c) => {
      const role = c.role || "Без роли";
      roleCount.set(role, (roleCount.get(role) ?? 0) + 1);
    });
    const totalByRole = filteredCandidates.length;
    const candidatesByRole = Array.from(roleCount.entries())
      .map(([label, value]) => ({
        label,
        value: totalByRole > 0 ? Math.round((value / totalByRole) * 100) : 0
      }))
      .sort((a, b) => b.value - a.value);

    const stageCount = new Map<string, number>();
    stageOrder.forEach((s) => stageCount.set(s, 0));
    filteredCandidates.forEach((c) => {
      if (stageCount.has(c.stage)) {
        stageCount.set(c.stage, (stageCount.get(c.stage) ?? 0) + 1);
      }
    });
    const totalByStage = filteredCandidates.length;
    const conversionByStage = Array.from(stageCount.entries())
      .map(([label, value]) => ({
        label,
        value: totalByStage > 0 ? Math.round((value / totalByStage) * 100) : 0
      }))
      .filter((item) => item.label);

    return {
      "time-to-hire": { title: "Вакансии по отделам", data: vacanciesByDept, isPercent: false },
      "source-quality": { title: "Кандидаты по ролям (%)", data: candidatesByRole, isPercent: true },
      "stage-conversion": { title: "Конверсия по этапам (%)", data: conversionByStage, isPercent: true }
    };
  }, [filteredVacancies, filteredCandidates]);
 
  const pillClass = (status: string) => {
    const normalized = status.toLowerCase();
    if (
      normalized.includes("подключено") ||
      normalized.includes("готово") ||
      normalized.includes("настроено") ||
      normalized.includes("активно") ||
      normalized.includes("подтверждено")
    ) {
      return "pill pill-success";
    }
    if (
      normalized.includes("риск") ||
      normalized.includes("ошибка") ||
      normalized.includes("крит") ||
      normalized === "error"
    ) {
      return "pill pill-danger";
    }
    if (normalized.includes("в работе") || normalized.includes("заплан")) {
      return "pill pill-warning";
    }
    return "pill";
  };
 
  const isAdmin = currentUser?.email === "admin@crm.ru";
 
  const visibleTabs = useMemo(() => {
    return tabs.filter((tab) => tab.id !== "admin" || isAdmin);
  }, [isAdmin]);
 
  useEffect(() => {
    if (apiConfigError) return;
    if (activeTab === "admin" && !isAdmin) {
      setActiveTab("dashboard");
      window.location.hash = "tab=dashboard";
    }
    
    // Загрузить чаты для администратора
    if (activeTab === "admin" && isAdmin && token) {
      const apiBase = getApiBase();
      const loadChats = async () => {
        try {
          const response = await fetch(`${apiBase}/admin/support-chats`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          if (response.ok) {
            const json = (await readJsonRes(response)) as { data: SupportChat[] };
            setAdminChats(json.data);
          }
        } catch (err) {
          console.error("Ошибка загрузки чатов:", err);
        }
      };
      loadChats();
    }
  }, [activeTab, isAdmin, token, apiConfigError]);

  useEffect(() => {
    if (apiConfigError) return;
    if (activeTab !== "tariff" || !token) return;
    const apiBase = getApiBase();
    const loadTariff = async () => {
      try {
        const [plansRes, subRes] = await Promise.all([
          fetch(`${apiBase}/plans`),
          fetch(`${apiBase}/subscription`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        if (plansRes.ok) {
          const j = (await readJsonRes(plansRes)) as { data: typeof plans };
          setPlans(j.data ?? []);
        }
        if (subRes.ok) {
          const j = (await readJsonRes(subRes)) as { data: typeof subscription };
          setSubscription(j.data ?? null);
        }
      } catch {
        // ignore
      }
    };
    loadTariff();
  }, [activeTab, token, apiConfigError]);

  useEffect(() => {
    if (apiConfigError) return;
    if (activeTab !== "matching" || !token) return;
    const apiBase = getApiBase();
    setAiServiceAvailable(null);
    fetch(`${apiBase}/ai/status`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => readJsonRes(r))
      .then((raw) => {
        const data = raw as { available?: boolean };
        setAiServiceAvailable(!!data.available);
      })
      .catch(() => setAiServiceAvailable(false));
  }, [activeTab, token, apiConfigError]);

  const calendarMonthLabel = calendarDate.toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric"
  });
 
  const monthStart = new Date(
    calendarDate.getFullYear(),
    calendarDate.getMonth(),
    1
  );
  const monthEnd = new Date(
    calendarDate.getFullYear(),
    calendarDate.getMonth() + 1,
    0
  );
  const startWeekday = (monthStart.getDay() + 6) % 7;
  const totalDays = monthEnd.getDate();
  const calendarCells = Array.from(
    { length: startWeekday + totalDays },
    (_, index) => {
      const dayNumber = index - startWeekday + 1;
      return dayNumber > 0 ? dayNumber : null;
    }
  );
 
  const eventsInMonth = calendarEvents.filter((event) =>
    event.date.startsWith(
      `${calendarDate.getFullYear()}-${String(
        calendarDate.getMonth() + 1
      ).padStart(2, "0")}`
    )
  );
 
  const filteredEvents =
    calendarFilter === "Все"
      ? eventsInMonth
      : eventsInMonth.filter((event) => event.status === calendarFilter);
 
  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    window.location.hash = `tab=${tabId}`;
    setIsSidebarOpen(false);
  };

  const loadIntegrations = async () => {
    if (!token) return;
    const apiBase = getApiBase();
    try {
      const res = await fetch(`${apiBase}/integrations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = (await readJsonRes(res)) as { data: Integration[] };
        setIntegrationsList(json.data);
      }
    } catch {
      // ignore
    }
  };

  const handleIntegrationConnect = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedIntegrationService || !integrationApiKey.trim() || !token) return;
    setIntegrationConnectLoading(true);
    const apiBase = getApiBase();
    try {
      const res = await fetch(`${apiBase}/integrations/${selectedIntegrationService}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ api_key: integrationApiKey.trim() })
      });
      if (res.ok) {
        await loadIntegrations();
        setShowIntegrationModal(false);
        setSelectedIntegrationService(null);
        setIntegrationApiKey("");
      } else {
        const err = (await readJsonRes(res)) as { error?: string };
        setError(err.error ?? "Ошибка подключения");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка подключения");
    } finally {
      setIntegrationConnectLoading(false);
    }
  };

  const handleIntegrationDisconnect = async (service: string) => {
    if (!token) return;
    const apiBase = getApiBase();
    try {
      const res = await fetch(`${apiBase}/integrations/${service}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) await loadIntegrations();
    } catch {
      // ignore
    }
  };

  const handleIntegrationSync = async (service: string) => {
    if (!token) return;
    setIntegrationSyncLoading(service);
    const apiBase = getApiBase();
    try {
      const res = await fetch(`${apiBase}/integrations/${service}/sync`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = (await readJsonRes(res)) as { data: { imported: { vacancies: number; candidates: number } } };
        await loadIntegrations();
        const { vacancies: v, candidates: c } = json.data.imported;
        setVacancies((prev) => [...prev]);
        setCandidates((prev) => [...prev]);
        const load = async () => {
          const [vr, cr] = await Promise.all([
            fetch(`${apiBase}/vacancies`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${apiBase}/candidates`, { headers: { Authorization: `Bearer ${token}` } })
          ]);
          if (vr.ok && cr.ok) {
            const vj = (await readJsonRes(vr)) as { data: Vacancy[] };
            const cj = (await readJsonRes(cr)) as { data: Candidate[] };
            setVacancies(vj.data);
            setCandidates(cj.data);
          }
        };
        await load();
        setError(null);
      } else {
        const err = (await readJsonRes(res)) as { error?: string };
        setError(err.error ?? "Ошибка синхронизации");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка синхронизации");
    } finally {
      setIntegrationSyncLoading(null);
    }
  };
 
  const handleCalendarNav = (direction: "prev" | "next") => {
    setCalendarDate((prev) => {
      const nextMonth =
        direction === "prev"
          ? new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
          : new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      return nextMonth;
    });
  };
 
  const handleCandidateEdit = (candidateId: string) => {
    const candidate = candidates.find((item) => item.id === candidateId);
    if (!candidate) {
      return;
    }
    setEditingCandidateId(candidateId);
    setCandidateForm({
      name: candidate.name,
      role: candidate.role,
      stage: candidate.stage,
      source: candidate.source ?? "",
      notes: candidate.notes ?? ""
    });
    setShowCandidateModal(true);
  };
 
  const handleCandidateDelete = async (candidateId: string) => {
    const apiBase = getApiBase();
    try {
      const response = await fetch(`${apiBase}/candidates/${candidateId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (response.ok) {
        setCandidates((prev) => prev.filter((item) => item.id !== candidateId));
        setMatches((prev) =>
          prev.filter((match) => match.candidateId !== candidateId)
        );
        setCalendarEvents((prev) =>
          prev.filter((event) => event.candidateId !== candidateId)
        );
      }
    } catch (err) {
      console.error("Ошибка удаления кандидата:", err);
    }
  };
 
  const handleMatchAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!matchingForm.candidateId) {
      return;
    }
    const apiBase = getApiBase();
    
    try {
      const response = await fetch(`${apiBase}/matches`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          candidateId: matchingForm.candidateId,
          score: Number(matchingForm.score),
          explanation: matchingForm.explanation.trim() || "Добавлено вручную.",
          vacancyId: "vac-001"
        })
      });
      
      if (response.ok) {
        const json = (await readJsonRes(response)) as { data: Match };
        setMatches((prev) => [...prev, json.data]);
        setMatchingForm({ candidateId: "", score: "0.8", explanation: "" });
      }
    } catch (err) {
      console.error("Ошибка добавления матча:", err);
    }
  };
 
  const handleMatchDelete = async (candidateId: string) => {
    const apiBase = getApiBase();
    try {
      const response = await fetch(`${apiBase}/matches/${candidateId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (response.ok) {
        setMatches((prev) =>
          prev.filter((match) => match.candidateId !== candidateId)
        );
      }
    } catch (err) {
      console.error("Ошибка удаления матча:", err);
    }
  };

  const handleEventSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const apiBase = getApiBase();
    
    try {
      const response = await fetch(`${apiBase}/calendar`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: eventForm.title,
          date: eventForm.date,
          time: eventForm.time,
          participants: eventForm.participants,
          status: eventForm.status,
          candidateId: eventForm.candidateId || undefined
        })
      });
      
      if (response.ok) {
        const json = (await readJsonRes(response)) as { data: CalendarEvent };
        setCalendarEvents((prev) => [...prev, json.data]);
        setShowEventModal(false);
        setEventForm({
          title: "",
          date: "",
          time: "",
          participants: "",
          status: "Запланировано",
          candidateId: ""
        });
      }
    } catch (err) {
      console.error("Ошибка добавления события:", err);
    }
  };

  const handleEventDelete = async (eventId: string) => {
    const apiBase = getApiBase();
    try {
      const response = await fetch(`${apiBase}/calendar/${eventId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (response.ok) {
        setCalendarEvents((prev) => prev.filter((item) => item.id !== eventId));
      }
    } catch (err) {
      console.error("Ошибка удаления события:", err);
    }
  };

  const handleAddCandidateToCalendar = (candidateId: string) => {
    const candidate = candidates.find((item) => item.id === candidateId);
    if (!candidate) {
      return;
    }
    setEventForm({
      title: `Интервью: ${candidate.name}`,
      date: "",
      time: "",
      participants: `${candidate.name} + интервьюер`,
      status: "Запланировано",
      candidateId
    });
    setShowEventModal(true);
  };

  const handleCommSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const apiBase = getApiBase();
    
    try {
      if (editingCommId) {
        const response = await fetch(`${apiBase}/communications/${editingCommId}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            channel: commForm.channel,
            template: commForm.template,
            audience: commForm.audience,
            status: commForm.status
          })
        });
        
        if (response.ok) {
          const json = (await readJsonRes(response)) as { data: Communication };
          setCommunications((prev) =>
            prev.map((comm) => (comm.id === editingCommId ? json.data : comm))
          );
          setEditingCommId(null);
          setShowCommModal(false);
          setCommForm({
            channel: "Email",
            template: "",
            audience: "",
            status: "Запланировано"
          });
        }
      } else {
        const response = await fetch(`${apiBase}/communications`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            channel: commForm.channel,
            template: commForm.template,
            audience: commForm.audience,
            status: commForm.status
          })
        });
        
        if (response.ok) {
          const json = (await readJsonRes(response)) as { data: Communication };
          setCommunications((prev) => [...prev, json.data]);
          setShowCommModal(false);
          setCommForm({
            channel: "Email",
            template: "",
            audience: "",
            status: "Запланировано"
          });
        }
      }
    } catch (err) {
      console.error("Ошибка сохранения коммуникации:", err);
    }
  };

  const handleCommEdit = (commId: string) => {
    const comm = communications.find((item) => item.id === commId);
    if (!comm) {
      return;
    }
    setEditingCommId(commId);
    setCommForm({
      channel: comm.channel,
      template: comm.template,
      audience: comm.audience,
      status: comm.status
    });
    setShowCommModal(true);
  };

  const handleCommDelete = async (commId: string) => {
    const apiBase = getApiBase();
    try {
      const response = await fetch(`${apiBase}/communications/${commId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (response.ok) {
        setCommunications((prev) => prev.filter((item) => item.id !== commId));
      }
    } catch (err) {
      console.error("Ошибка удаления коммуникации:", err);
    }
  };

  const handleSupportSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supportInput.trim()) {
      return;
    }
    const apiBase = getApiBase();
    setSupportLoading(true);
    
    try {
      const response = await fetch(`${apiBase}/support/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          content: supportInput.trim()
        })
      });
      
      if (response.ok) {
        const json = (await readJsonRes(response)) as { data: SupportMessage[] };
        setSupportMessages((prev) => [...prev, ...json.data]);
        setSupportInput("");
      }
    } catch (err) {
      console.error("Ошибка отправки сообщения:", err);
    } finally {
      setSupportLoading(false);
    }
  };

  const handleAdminReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!adminReplyInput.trim() || !selectedChatUserId) {
      return;
    }
    const apiBase = getApiBase();
    
    try {
      const response = await fetch(`${apiBase}/admin/support-reply`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId: selectedChatUserId,
          content: adminReplyInput.trim()
        })
      });
      
      if (response.ok) {
        const json = (await readJsonRes(response)) as { data: SupportMessage };
        setAdminChats((prev) =>
          prev.map((chat) =>
            chat.userId === selectedChatUserId
              ? {
                  ...chat,
                  messages: [...chat.messages, json.data],
                  lastMessage: json.data
                }
              : chat
          )
        );
        setAdminReplyInput("");
      }
    } catch (err) {
      console.error("Ошибка отправки ответа:", err);
    }
  };
 
  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setAuthLoading(true);
    const apiBase = getApiBase();
 
    try {
      const payload =
        authMode === "register"
          ? {
              name: authForm.name.trim(),
              email: authForm.email.trim(),
              password: authForm.password
            }
          : {
              email: authForm.email.trim(),
              password: authForm.password
            };
 
      const response = await fetch(`${apiBase}/auth/${authMode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = (await readJsonRes(response)) as {
        token?: string;
        user?: AuthUser;
        error?: string;
        message?: string;
        requires_verification?: boolean;
      };

      if (json.requires_verification) {
        setAuthError(null);
        setAuthForm({ name: "", email: json.user?.email ?? "", password: "" });
        setPendingVerificationEmail(json.user?.email ?? null);
        setVerificationCode("");
        setAuthSuccess(json.message ?? "На email отправлено письмо с кодом. Введите код ниже или перейдите по ссылке из письма.");
        return;
      }

      if (!response.ok || !json.token || !json.user) {
        throw new Error(json.error ?? json.message ?? "Ошибка авторизации.");
      }

      setToken(json.token);
      setCurrentUser(json.user);
      localStorage.setItem("naymi_token", json.token);
      localStorage.setItem("naymi_user", JSON.stringify(json.user));
      setAuthForm({ name: "", email: "", password: "" });
      setActiveTab("dashboard");
      window.location.hash = "tab=dashboard";
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : "Ошибка авторизации."
      );
    } finally {
      setAuthLoading(false);
    }
  };
 
  const handleVerifyCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!pendingVerificationEmail || verificationCode.trim().length !== 6) return;
    setAuthError(null);
    setAuthLoading(true);
    const apiBase = getApiBase();
    try {
      const res = await fetch(`${apiBase}/auth/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingVerificationEmail, code: verificationCode.trim() })
      });
      const json = (await readJsonRes(res)) as { success?: boolean; message?: string; error?: string };
      if (res.ok && json.success) {
        setPendingVerificationEmail(null);
        setVerificationCode("");
        setAuthSuccess(json.message ?? "Email подтверждён. Войдите в систему.");
        setAuthMode("login");
      } else {
        setAuthError(json.error ?? "Неверный код. Проверьте письмо или запросите новое.");
      }
    } catch {
      setAuthError("Ошибка сети. Попробуйте ещё раз.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem("naymi_token");
    localStorage.removeItem("naymi_user");
  };
 
  const handleVacancySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const apiBase = getApiBase();
    
    try {
      const payload = {
        title: vacancyForm.title,
        department: vacancyForm.department,
        location: vacancyForm.location,
        status: vacancyForm.status,
        details: {
          employeeType: vacancyForm.employeeType,
          employmentType: vacancyForm.employmentType,
          workFormat: vacancyForm.workFormat,
          laborContract: vacancyForm.laborContract,
          internship: vacancyForm.internship,
          gph: vacancyForm.gph,
          gphSelfEmployed: vacancyForm.gphSelfEmployed,
          gphIE: vacancyForm.gphIE,
          gphIndividual: vacancyForm.gphIndividual,
          schedule: vacancyForm.schedule,
          scheduleHoursPerDay: vacancyForm.scheduleHoursPerDay,
          nightShifts: vacancyForm.nightShifts,
          publicationCities: vacancyForm.publicationCities,
          workAddress: vacancyForm.workAddress,
          salaryFrom: vacancyForm.salaryFrom,
          salaryTo: vacancyForm.salaryTo,
          salaryCurrency: vacancyForm.salaryCurrency,
          salaryPeriod: vacancyForm.salaryPeriod,
          salaryTax: vacancyForm.salaryTax,
          paymentFrequency: vacancyForm.paymentFrequency,
          description: vacancyForm.description,
          skills: vacancyForm.skills
        }
      };

      if (editingVacancyId) {
        const response = await fetch(`${apiBase}/vacancies/${editingVacancyId}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });
        
        if (response.ok) {
          const json = (await readJsonRes(response)) as { data: Vacancy };
          setVacancies((prev) =>
            prev.map((vacancy) =>
              vacancy.id === editingVacancyId ? json.data : vacancy
            )
          );
          setEditingVacancyId(null);
          setShowVacancyModal(false);
          setVacancyForm({ ...DEFAULT_VACANCY_FORM });
        } else {
          const json = (await readJsonRes(response).catch(() => ({}))) as { error?: string };
          alert(json.error ?? "Не удалось сохранить вакансию.");
        }
      } else {
        const response = await fetch(`${apiBase}/vacancies`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });
        
        if (response.ok) {
          const json = (await readJsonRes(response)) as { data: Vacancy };
          setVacancies((prev) => [...prev, json.data]);
          setShowVacancyModal(false);
          setVacancyForm({ ...DEFAULT_VACANCY_FORM });
        } else {
          const json = (await readJsonRes(response).catch(() => ({}))) as { error?: string };
          alert(json.error ?? "Не удалось создать вакансию.");
        }
      }
    } catch (err) {
      console.error("Ошибка сохранения вакансии:", err);
      alert("Ошибка сети при сохранении вакансии.");
    }
  };
 
  const handleVacancyEdit = (vacancyId: string) => {
    const vacancy = vacancies.find((item) => item.id === vacancyId);
    if (!vacancy) return;
    const d = (vacancy.details ?? {}) as Record<string, unknown>;
    setEditingVacancyId(vacancyId);
    setVacancyForm({
      ...DEFAULT_VACANCY_FORM,
      title: vacancy.title,
      department: vacancy.department,
      location: vacancy.location,
      status: vacancy.status,
      employeeType: (d.employeeType as "permanent" | "temporary") || "permanent",
      employmentType: (d.employmentType as "full" | "part" | "shift") || "full",
      workFormat: Array.isArray(d.workFormat) ? d.workFormat as string[] : [],
      laborContract: !!d.laborContract,
      internship: !!d.internship,
      gph: !!d.gph,
      gphSelfEmployed: !!d.gphSelfEmployed,
      gphIE: !!d.gphIE,
      gphIndividual: !!d.gphIndividual,
      schedule: Array.isArray(d.schedule)
        ? (d.schedule as string[])
        : d.schedule
          ? [String(d.schedule)]
          : [],
      scheduleHoursPerDay: Array.isArray(d.scheduleHoursPerDay)
        ? (d.scheduleHoursPerDay as string[])
        : d.scheduleHoursPerDay
          ? [String(d.scheduleHoursPerDay)]
          : [],
      nightShifts: !!d.nightShifts,
      publicationCities: Array.isArray(d.publicationCities) ? d.publicationCities as string[] : [],
      workAddress: String(d.workAddress ?? ""),
      salaryFrom: String(d.salaryFrom ?? ""),
      salaryTo: String(d.salaryTo ?? ""),
      salaryCurrency: String(d.salaryCurrency ?? "RUB"),
      salaryPeriod: String(d.salaryPeriod ?? "month"),
      salaryTax: (d.salaryTax as "gross" | "net") || "gross",
      paymentFrequency: String(d.paymentFrequency ?? ""),
      description: String(d.description ?? ""),
      skills: Array.isArray(d.skills) ? d.skills as string[] : []
    });
    setShowVacancyModal(true);
  };
 
  const handleVacancyDelete = async (vacancyId: string) => {
    const apiBase = getApiBase();
    try {
      const response = await fetch(`${apiBase}/vacancies/${vacancyId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (response.ok) {
        setVacancies((prev) => prev.filter((item) => item.id !== vacancyId));
        setMatches((prev) => prev.filter((match) => match.vacancyId !== vacancyId));
      }
    } catch (err) {
      console.error("Ошибка удаления вакансии:", err);
    }
  };
 
  const handleCandidateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const apiBase = getApiBase();
    
    try {
      if (editingCandidateId) {
        const response = await fetch(`${apiBase}/candidates/${editingCandidateId}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: candidateForm.name,
            role: candidateForm.role,
            stage: candidateForm.stage,
            source: candidateForm.source,
            notes: candidateForm.notes
          })
        });
        
        if (response.ok) {
          const json = (await readJsonRes(response)) as { data: Candidate };
          setCandidates((prev) =>
            prev.map((candidate) =>
              candidate.id === editingCandidateId ? json.data : candidate
            )
          );
          setEditingCandidateId(null);
          setShowCandidateModal(false);
          setCandidateForm({
            name: "",
            role: "",
            stage: "Отклик",
            source: "",
            notes: ""
          });
        }
      } else {
        const response = await fetch(`${apiBase}/candidates`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: candidateForm.name,
            role: candidateForm.role,
            stage: candidateForm.stage,
            skills: [],
            source: candidateForm.source,
            notes: candidateForm.notes
          })
        });
        
        if (response.ok) {
          const json = (await readJsonRes(response)) as { data: Candidate };
          setCandidates((prev) => [...prev, json.data]);
          setShowCandidateModal(false);
          setCandidateForm({
            name: "",
            role: "",
            stage: "Отклик",
            source: "",
            notes: ""
          });
        }
      }
    } catch (err) {
      console.error("Ошибка сохранения кандидата:", err);
    }
  };
 
  if (apiConfigError) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Нужна настройка API</h1>
          <p className="muted" style={{ whiteSpace: "pre-wrap" }}>
            {apiConfigError}
          </p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div>
            <h1>Найми</h1>
            <p className="muted">
              Войдите или зарегистрируйтесь, чтобы продолжить работу.
            </p>
          </div>
          {pendingVerificationEmail ? (
            <>
              <p className="muted">На <strong>{pendingVerificationEmail}</strong> отправлено письмо с кодом подтверждения.</p>
              {authSuccess ? <p className="auth-success">{authSuccess}</p> : null}
              {authError ? <p className="auth-error">{authError}</p> : null}
              <form className="auth-form" onSubmit={handleVerifyCode}>
                <label className="field">
                  Код из письма (6 цифр)
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    required
                  />
                </label>
                <button className="primary-btn" type="submit" disabled={authLoading || verificationCode.length !== 6}>
                  {authLoading ? "Проверка..." : "Подтвердить"}
                </button>
              </form>
              <button
                type="button"
                className="secondary-btn"
                style={{ marginTop: 8 }}
                onClick={() => { setPendingVerificationEmail(null); setVerificationCode(""); setAuthMode("login"); }}
              >
                Отмена, войти по ссылке из письма
              </button>
            </>
          ) : (
          <>
          <div className="auth-switch">
            <button
              className={`tab ${authMode === "login" ? "active" : ""}`}
              onClick={() => setAuthMode("login")}
              type="button"
            >
              Вход
            </button>
            <button
              className={`tab ${authMode === "register" ? "active" : ""}`}
              onClick={() => setAuthMode("register")}
              type="button"
            >
              Регистрация
            </button>
          </div>
          <form className="auth-form" onSubmit={handleAuthSubmit}>
            {authMode === "register" ? (
              <label className="field">
                Имя
                <input
                  type="text"
                  value={authForm.name}
                  onChange={(event) =>
                    setAuthForm((prev) => ({
                      ...prev,
                      name: event.target.value
                    }))
                  }
                  placeholder="Иван Иванов"
                  required
                />
              </label>
            ) : null}
            <label className="field">
              Email
              <input
                type="email"
                value={authForm.email}
                onChange={(event) =>
                  setAuthForm((prev) => ({
                    ...prev,
                    email: event.target.value
                  }))
                }
                placeholder={authMode === "register" ? "ivan@company.ru" : "Введите email"}
                required
              />
            </label>
            <label className="field">
              Пароль
              <input
                type="password"
                value={authForm.password}
                onChange={(event) =>
                  setAuthForm((prev) => ({
                    ...prev,
                    password: event.target.value
                  }))
                }
                placeholder={authMode === "register" ? "Минимум 6 символов" : "Введите пароль"}
                required
              />
            </label>
            {authSuccess ? <p className="auth-success">{authSuccess}</p> : null}
            {authError ? <p className="auth-error">{authError}</p> : null}
            <button className="primary-btn" type="submit" disabled={authLoading}>
              {authLoading
                ? "Подождите..."
                : authMode === "login"
                  ? "Войти"
                  : "Зарегистрироваться"}
            </button>
          </form>
          </>
          )}
        </div>
      </div>
    );
  }
 
  return (
    <div className="shell">
      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div>
            <strong>Найми</strong>
            <p className="muted">Навигация</p>
          </div>
        </div>
        <nav className="sidebar-nav">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              className={`sidebar-link ${
                activeTab === tab.id ? "active" : ""
              }`}
              onClick={() => handleTabClick(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>
 
      {isSidebarOpen ? (
        <button
          className="sidebar-overlay"
          onClick={() => setIsSidebarOpen(false)}
          type="button"
          aria-label="Закрыть навигацию"
        />
      ) : null}
 
      <div className="app">
        <header className="top-bar">
          <div className="top-left">
            <button
              className="hamburger"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              type="button"
            >
              ☰
            </button>
            <div>
              <h1>Найми</h1>
              <p>Платформа для умного найма</p>
            </div>
          </div>
          <div className="top-actions">
            <span className="muted">
              {currentUser ? currentUser.name : "Пользователь"}
            </span>
            <button className="secondary-btn" onClick={handleLogout}>
              Выйти
            </button>
            <button
              className="primary-btn"
              onClick={() => setShowVacancyModal(true)}
            >
              Создать вакансию
            </button>
          </div>
        </header>
 
      {error ? (
        <div className="card">
          <strong>Бэкенд недоступен</strong>
          <p className="muted">
            {error} Запустите бэкенд на порту 4000, чтобы увидеть данные.
          </p>
        </div>
      ) : null}
 
      {activeTab === "dashboard" ? (
        <>
          <section className="dashboard-intro">
            <h2>Добро пожаловать</h2>
            <p className="muted">Вот обзор вашей активности по подбору персонала</p>
          </section>

          <section className="dashboard-kpi-grid">
            {dashboardKpis.map((kpi) => (
              <div className="card dashboard-kpi-card" key={kpi.label}>
                <p className="card-label">{kpi.label}</p>
                <h2>{kpi.value}</h2>
              </div>
            ))}
          </section>

          <section className="dashboard-main-grid">
            <div className="card dashboard-dynamics-card">
              <h3>Динамика найма</h3>
              {dashboardTrend.labels.length === 0 ? (
                <p className="muted">Данных пока нет</p>
              ) : (
                <div className="dashboard-line-chart">
                  {(() => {
                    const maxVal = Math.max(
                      ...dashboardTrend.candidatesSeries,
                      ...dashboardTrend.hiredSeries,
                      1
                    );
                    const pointsFor = (values: number[]) =>
                      values
                        .map((value, idx) => {
                          const x = values.length <= 1 ? 0 : (idx / (values.length - 1)) * 100;
                          const y = 100 - (value / maxVal) * 100;
                          return `${x},${y}`;
                        })
                        .join(" ");
                    return (
                      <>
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Динамика найма">
                          <polyline points={pointsFor(dashboardTrend.candidatesSeries)} className="line-primary" />
                          <polyline points={pointsFor(dashboardTrend.hiredSeries)} className="line-secondary" />
                        </svg>
                        <div className="chart-legend">
                          <span><i className="dot dot-primary" /> Кандидаты</span>
                          <span><i className="dot dot-secondary" /> Найм</span>
                        </div>
                        <div className="chart-months">
                          {dashboardTrend.labels.map((label) => (
                            <span key={label}>{label}</span>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="card dashboard-latest-card">
              <div className="dashboard-latest-header">
                <h3>Последние кандидаты</h3>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    setActiveTab("candidates");
                    window.location.hash = "tab=candidates";
                  }}
                >
                  Все
                </button>
              </div>
              {latestCandidates.length === 0 ? (
                <p className="muted">Кандидатов пока нет</p>
              ) : (
                <ul className="dashboard-latest-list">
                  {latestCandidates.map((candidate) => (
                    <li key={candidate.id}>
                      <span className="candidate-avatar">{getInitials(candidate.name)}</span>
                      <div className="list-main">
                        <strong>{candidate.name}</strong>
                        <span className="muted">{candidate.role || "Кандидат"}</span>
                      </div>
                      <span className={pillClass(candidate.stage)}>{candidate.stage}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      ) : null}
 
      {activeTab === "vacancies" ? (
        <section className="grid">
          <div className="card">
            <h3>Управление вакансиями</h3>
            <p className="muted">
              Создавайте вакансии, определяйте требования, SLA этапов и
              управляйте статусами найма.
            </p>
            <button
              className="primary-btn"
              onClick={() => {
                setEditingVacancyId(null);
                setVacancyForm({ ...DEFAULT_VACANCY_FORM });
                setShowVacancyModal(true);
              }}
            >
              Создать вакансию
            </button>
          </div>
          <div className="card">
            <h3>Открытые вакансии</h3>
            {loading ? (
              <p className="muted">Загрузка вакансий...</p>
            ) : (
              <ul className="funnel">
                {vacancies.map((vacancy) => (
                  <li key={vacancy.id}>
                    <div className="list-main">
                      <span>
                        {vacancy.title}
                        <span className="muted"> · {vacancy.department}</span>
                      </span>
                      <span className="muted">{vacancy.location}</span>
                    </div>
                    <div className="list-actions">
                      <button
                        className="secondary-btn"
                        type="button"
                        onClick={() => handleVacancyEdit(vacancy.id)}
                      >
                        Редактировать
                      </button>
                      <button
                        className="danger-btn"
                        type="button"
                        onClick={() => handleVacancyDelete(vacancy.id)}
                      >
                        Удалить
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}
 
      {activeTab === "candidates" ? (
        <section className="candidates-section">
          <div className="card candidates-funnel-strip">
            <h3>Воронка найма</h3>
            <p className="muted small">
              Отклики и новые заявки начинаются с этапа «Отклик». После запуска ИИ-матчинга этапы обновляются: условно
              подходящие → Скрининг, подходящие → Интервью, остальные → Поиск.
            </p>
            <div className="funnel-strip-grid">
              {funnelStageCounts.map(({ stage, count }) => (
                <div key={stage} className="funnel-strip-item">
                  <span className="funnel-strip-count">{count}</span>
                  <span className="funnel-strip-label">{stage}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card candidates-card">
            <div className="candidates-toolbar">
              <div>
                <h3>Кандидаты</h3>
                <p className="muted">Таблица с фильтрами</p>
              </div>
              <div className="candidates-toolbar-controls">
                <input
                  type="search"
                  placeholder="Поиск: имя, роль, источник"
                  value={candidateListQuery}
                  onChange={(e) => setCandidateListQuery(e.target.value)}
                  aria-label="Поиск кандидатов"
                />
                <label className="field inline">
                  Этап
                  <select value={candidateListStage} onChange={(e) => setCandidateListStage(e.target.value)}>
                    <option value="Все">Все этапы</option>
                    {stageOrder.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="secondary-btn"
                  type="button"
                  onClick={() => {
                    setEditingCandidateId(null);
                    setCandidateForm({
                      name: "",
                      role: "",
                      stage: "Отклик",
                      source: "",
                      notes: ""
                    });
                    setShowCandidateModal(true);
                  }}
                >
                  Добавить кандидата
                </button>
              </div>
            </div>
            {loading ? (
              <p className="muted">Загрузка кандидатов…</p>
            ) : candidatesForTab.length === 0 ? (
              <p className="muted">Никого не найдено. Измените фильтр или добавьте кандидата.</p>
            ) : (
              <div className="table-wrap">
                <table className="candidates-table">
                  <thead>
                    <tr>
                      <th>Имя</th>
                      <th>Роль</th>
                      <th>Этап</th>
                      <th>Источник</th>
                      <th>Заметки</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {candidatesForTab.map((candidate) => (
                      <tr key={candidate.id}>
                        <td>
                          <strong>{candidate.name}</strong>
                        </td>
                        <td>{candidate.role}</td>
                        <td>
                          <span className="pill">{candidate.stage}</span>
                        </td>
                        <td className="muted">{candidate.source?.trim() ? candidate.source : "—"}</td>
                        <td className="muted table-notes">
                          {candidate.notes?.trim()
                            ? candidate.notes.length > 100
                              ? `${candidate.notes.slice(0, 100)}…`
                              : candidate.notes
                            : "—"}
                        </td>
                        <td className="table-actions">
                          <button
                            type="button"
                            className="calendar-btn"
                            onClick={() => handleAddCandidateToCalendar(candidate.id)}
                            title="Добавить в календарь"
                          >
                            Календарь
                          </button>
                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={() => handleCandidateEdit(candidate.id)}
                          >
                            Изменить
                          </button>
                          <button
                            type="button"
                            className="danger-btn"
                            onClick={() => handleCandidateDelete(candidate.id)}
                          >
                            Удалить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      ) : null}
 
      {activeTab === "communications" ? (
        <section className="grid">
          <div className="card">
            <div className="calendar-header">
              <div>
                <h3>Автоматизированные коммуникации</h3>
                <p className="muted">
                  Шаблоны сообщений, расписание и омниканальность: email, чат, SMS.
                </p>
              </div>
              <button
                className="primary-btn"
                type="button"
                onClick={() => {
                  setEditingCommId(null);
                  setCommForm({
                    channel: "Email",
                    template: "",
                    audience: "",
                    status: "Запланировано"
                  });
                  setShowCommModal(true);
                }}
              >
                Создать коммуникацию
              </button>
            </div>
            <ul className="funnel">
              {communications.length === 0 ? (
                <p className="muted">Коммуникаций пока нет</p>
              ) : (
                communications.map((item) => (
                  <li key={item.id}>
                    <div className="list-main">
                      <span>
                        {item.template}
                        <span className="muted"> · {item.channel}</span>
                      </span>
                      <span className="muted">{item.audience}</span>
                    </div>
                    <div className="list-actions">
                      <span className={pillClass(item.status)}>{item.status}</span>
                      <button
                        className="secondary-btn"
                        type="button"
                        onClick={() => handleCommEdit(item.id)}
                      >
                        Редактировать
                      </button>
                      <button
                        className="danger-btn"
                        type="button"
                        onClick={() => handleCommDelete(item.id)}
                      >
                        Удалить
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>
      ) : null}
 
      {activeTab === "calendar" ? (
        <section className="grid">
          <div className="card">
            <div className="calendar-header">
              <div>
                <h3>Календарь действий</h3>
                <p className="muted">Планирование интервью, офферов и встреч</p>
              </div>
              <div className="calendar-actions">
                <button
                  className="secondary-btn"
                  type="button"
                  onClick={() => handleCalendarNav("prev")}
                >
                  ◀
                </button>
                <span className="calendar-month">{calendarMonthLabel}</span>
                <button
                  className="secondary-btn"
                  type="button"
                  onClick={() => handleCalendarNav("next")}
                >
                  ▶
                </button>
              </div>
            </div>
            <div className="calendar-grid">
              {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
                <span className="calendar-day" key={day}>
                  {day}
                </span>
              ))}
              {calendarCells.map((day, index) => {
                if (!day) {
                  return <span className="calendar-cell empty" key={index} />;
                }
                const dateKey = `${calendarDate.getFullYear()}-${String(
                  calendarDate.getMonth() + 1
                ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayEvents = eventsInMonth.filter(
                  (event) => event.date === dateKey
                );
                return (
                  <div className="calendar-cell" key={dateKey}>
                    <span className="calendar-number">{day}</span>
                    {dayEvents.slice(0, 2).map((event) => (
                      <span className="calendar-event" key={event.title}>
                        {event.title}
                      </span>
                    ))}
                    {dayEvents.length > 2 ? (
                      <span className="calendar-more">
                        +{dayEvents.length - 2}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="card">
            <div className="calendar-header">
              <h3>Список событий</h3>
              <button
                className="primary-btn"
                type="button"
                onClick={() => {
                  setEventForm({
                    title: "",
                    date: "",
                    time: "",
                    participants: "",
                    status: "Запланировано",
                    candidateId: ""
                  });
                  setShowEventModal(true);
                }}
              >
                Создать напоминание
              </button>
            </div>
            <div className="filters">
              {["Все", "Запланировано", "В работе", "Подтверждено"].map(
                (status) => (
                  <button
                    key={status}
                    className={`filter-chip ${
                      calendarFilter === status ? "active" : ""
                    }`}
                    type="button"
                    onClick={() => setCalendarFilter(status)}
                  >
                    {status}
                  </button>
                )
              )}
            </div>
            <ul className="funnel">
              {filteredEvents.length === 0 ? (
                <p className="muted">Событий не найдено</p>
              ) : (
                filteredEvents.map((event) => (
                  <li key={event.id}>
                    <span>
                      {event.title}
                      <span className="muted">
                        {" "}
                        · {event.date} · {event.time}
                      </span>
                    </span>
                    <div className="list-actions">
                      <span className={pillClass(event.status)}>
                        {event.status}
                      </span>
                      <button
                        className="danger-btn"
                        type="button"
                        onClick={() => handleEventDelete(event.id)}
                      >
                        Удалить
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>
      ) : null}
 
      {activeTab === "matching" ? (
        <section className="grid">
          <div className="card">
            {aiServiceAvailable === false ? (
              <div className="info-banner" style={{ marginBottom: "1rem", background: "var(--surface-2)", borderLeft: "4px solid var(--accent)" }}>
                <strong>AI-матчинг недоступен</strong>
                <p className="muted" style={{ marginTop: "0.5rem" }}>
                  AI-сервис запускается автоматически вместе с backend. Подождите 10–15 секунд после старта и обновите страницу.
                  Если не заработало: в папке <code>ai</code> должен быть <code>python app.py</code>, в backend — Python в PATH.
                </p>
              </div>
            ) : null}
            <div className="ai-header">
              <div>
                <h3>Автоматический ИИ-матчинг</h3>
                <p className="muted">
                  Выберите вакансию и запустите автоматический анализ всех кандидатов.
                  Система оценит каждого по 10-бальной шкале и отсортирует по категориям.
                </p>
              </div>
              {aiMatches.length > 0 ? (
                <button
                  className="primary-btn"
                  onClick={() => setShowFullReport(true)}
                >
                  Полный отчет
                </button>
              ) : null}
            </div>

            <div className="form-grid">
              <label className="field">
                Вакансия для анализа
                <select
                  value={selectedVacancyForMatching}
                  onChange={(event) => setSelectedVacancyForMatching(event.target.value)}
                >
                  <option value="">Выберите вакансию</option>
                  {vacancies.map((vacancy) => (
                    <option key={vacancy.id} value={vacancy.id}>
                      {vacancy.title} · {vacancy.department}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="primary-btn"
                style={{height: "fit-content", marginTop: "auto"}}
                onClick={async () => {
                  if (!selectedVacancyForMatching) {
                    setAiMatchingError("Выберите вакансию");
                    return;
                  }
                  
                  setAiMatchingLoading(true);
                  setAiMatchingError(null);
                  const apiBase = getApiBase();
                  
                  try {
                    const response = await fetch(`${apiBase}/ai/match/batch`, {
                      method: "POST",
                      headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                      },
                      body: JSON.stringify({
                        vacancy_id: selectedVacancyForMatching,
                        auto_save: true
                      })
                    });
                    
                    const data = (await readJsonRes(response)) as {
                      error?: string;
                      details?: string;
                      matches?: AIMatchResult[];
                    };
                    if (!response.ok) {
                      throw new Error(data.error ?? data.details ?? `Ошибка ${response.status}`);
                    }
                    setAiMatches(data.matches || []);
                    if (data.matches && data.matches.length > 0) {
                      const matchRes = await fetch(`${apiBase}/matches`, {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      if (matchRes.ok) {
                        const matchJson = (await readJsonRes(matchRes)) as { data: Match[] };
                        setMatches(matchJson.data);
                      }
                    }
                  } catch (err) {
                    const message = err instanceof Error ? err.message : "Ошибка AI-сервиса";
                    setAiMatchingError(message);
                  } finally {
                    setAiMatchingLoading(false);
                  }
                }}
                disabled={aiMatchingLoading || !selectedVacancyForMatching || aiServiceAvailable === false}
              >
                {aiMatchingLoading ? "Анализ кандидатов..." : aiServiceAvailable === false ? "AI-сервис не запущен" : "Запустить AI-анализ"}
              </button>
            </div>
            
            {aiMatchingError ? (
              <div className="error-banner">
                {aiMatchingError}
              </div>
            ) : null}
            
            {aiMatches.length > 0 ? (
              <div className="ai-summary-enhanced">
                <div className="summary-header">
                  <h4>Результаты анализа</h4>
                  <div className="summary-actions">
                    <button
                      className="export-btn"
                      onClick={() => {
                        const selectedVacancy = vacancies.find(v => v.id === selectedVacancyForMatching);
                        const csvContent = [
                          "Кандидат,Роль,Оценка,Категория,Навыки (совп/треб),Семантика,Опыт,Объяснение",
                          ...aiMatches.map(m => {
                            const cand = candidates.find(c => c.id === m.candidate_id);
                            return `"${cand?.name || m.candidate_id}","${cand?.role || '-'}",${m.score},"${m.category}","${m.details.skills_match.matched}/${m.details.skills_match.required}",${Math.round(m.details.semantic_similarity * 100)}%,${Math.round(m.details.experience_match * 100)}%,"${m.explanation.replace(/"/g, '""')}"`;
                          })
                        ].join('\n');
                        
                        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(blob);
                        link.download = `AI_Match_Report_${selectedVacancy?.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
                        link.click();
                      }}
                    >
                      Экспорт CSV
                    </button>
                  </div>
                </div>
                
                <div className="kpi-grid-enhanced">
                  <div className="stat-card total">
                    <div className="stat-content">
                      <span className="stat-label">Всего проанализировано</span>
                      <span className="stat-value">{aiMatches.length}</span>
                    </div>
                  </div>
                  
                  <div className="stat-card suitable">
                    <div className="stat-content">
                      <span className="stat-label">Подходящие (7-10)</span>
                      <span className="stat-value">{aiMatches.filter(m => m.score >= 7).length}</span>
                      <span className="stat-percent">
                        {aiMatches.length > 0 ? Math.round((aiMatches.filter(m => m.score >= 7).length / aiMatches.length) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="stat-card conditional">
                    <div className="stat-content">
                      <span className="stat-label">Условно подходящие (4-6)</span>
                      <span className="stat-value">{aiMatches.filter(m => m.score >= 4 && m.score < 7).length}</span>
                      <span className="stat-percent">
                        {aiMatches.length > 0 ? Math.round((aiMatches.filter(m => m.score >= 4 && m.score < 7).length / aiMatches.length) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="stat-card unsuitable">
                    <div className="stat-content">
                      <span className="stat-label">Не подходящие (1-3)</span>
                      <span className="stat-value">{aiMatches.filter(m => m.score < 4).length}</span>
                      <span className="stat-percent">
                        {aiMatches.length > 0 ? Math.round((aiMatches.filter(m => m.score < 4).length / aiMatches.length) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
                
                {aiMatches.filter(m => m.needs_review).length > 0 ? (
                  <div className="warning-banner">
                    <strong>{aiMatches.filter(m => m.needs_review).length} кандидатов</strong> требуют дополнительной проверки HR-специалистом
                  </div>
                ) : null}
                
                <div className="ai-insights">
                  <h5>Рекомендации:</h5>
                  <ul>
                    {aiMatches.filter(m => m.score >= 7).length > 0 ? (
                      <li>Приглашайте на собеседование {aiMatches.filter(m => m.score >= 7).length} лучших кандидатов</li>
                    ) : (
                      <li>Идеальных кандидатов не найдено. Рассмотрите условно подходящих.</li>
                    )}
                    {aiMatches.filter(m => m.score >= 7).length > 0 ? (
                      <li>
                        Топ кандидат: {(() => {
                          const topMatch = aiMatches.reduce((prev, curr) => prev.score > curr.score ? prev : curr);
                          const topCand = candidates.find(c => c.id === topMatch.candidate_id);
                          return `${topCand?.name || 'N/A'} (${topMatch.score.toFixed(1)}/10)`;
                        })()}
                      </li>
                    ) : null}
                    <li>
                      Средняя оценка: {(aiMatches.reduce((sum, m) => sum + m.score, 0) / aiMatches.length).toFixed(1)}/10
                    </li>
                  </ul>
                </div>
              </div>
            ) : null}
          </div>
          
          {aiMatches.length > 0 ? (
            <>
              <div className="card">
                <h3>Подходящие кандидаты (7-10 баллов)</h3>
                <p className="muted">Рекомендуются к приглашению на собеседование</p>
                {aiMatches.filter(m => m.score >= 7).length === 0 ? (
                  <p className="muted">Кандидатов в этой категории нет</p>
                ) : (
                  <ul className="ai-match-list">
                    {aiMatches
                      .filter(m => m.score >= 7)
                      .map((match) => {
                        const candidate = candidates.find(c => c.id === match.candidate_id);
                        return (
                          <li key={match.candidate_id} className="ai-match-item suitable">
                            <div className="match-header">
                              <div>
                                <strong>{candidate?.name ?? "Кандидат"}</strong>
                                <span className="muted"> · {candidate?.role ?? "Роль не указана"}</span>
                              </div>
                              <div className="match-score-badge suitable">
                                {match.score.toFixed(1)}/10
                              </div>
                            </div>
                            <div className="match-details">
                              <div className="detail-row">
                                <span>Навыки:</span>
                                <span>
                                  {match.details.skills_match.matched}/{match.details.skills_match.required}
                                  {match.details.skills_match.matched >= match.details.skills_match.required ? " Да" : ""}
                                </span>
                              </div>
                              <div className="detail-row">
                                <span>Семантика:</span>
                                <span>{Math.round(match.details.semantic_similarity * 100)}%</span>
                              </div>
                              <div className="detail-row">
                                <span>Опыт:</span>
                                <span>{Math.round(match.details.experience_match * 100)}%</span>
                              </div>
                              <div className="detail-row">
                                <span>Образование:</span>
                                <span>{match.details.education_match ? "Да" : "Нет"}</span>
                              </div>
                            </div>
                            <p className="match-explanation">{match.explanation}</p>
                            {match.needs_review ? (
                              <span className="review-badge">Требует проверки HR</span>
                            ) : null}
                            <button
                              className="secondary-btn"
                              onClick={() => 
                                setShowAIMatchDetails(
                                  showAIMatchDetails === match.candidate_id ? null : match.candidate_id
                                )
                              }
                            >
                              {showAIMatchDetails === match.candidate_id ? "Скрыть детали" : "Показать детали"}
                            </button>
                            {showAIMatchDetails === match.candidate_id ? (
                              <div className="extended-details">
                                <h5>Подробная разбивка:</h5>
                                <div className="detail-grid">
                                  <div>
                                    <strong>Совпавшие навыки:</strong>
                                    <p className="muted">{match.details.skills_match.matched} из {match.details.skills_match.required}</p>
                                  </div>
                                  {match.details.skills_match.missing && match.details.skills_match.missing.length > 0 ? (
                                    <div>
                                      <strong>Отсутствуют:</strong>
                                      <p className="muted">{match.details.skills_match.missing.join(", ")}</p>
                                    </div>
                                  ) : null}
                                  <div>
                                    <strong>Уверенность модели:</strong>
                                    <p className="muted">{Math.round(match.confidence * 100)}%</p>
                                  </div>
                                  {match.details.nice_to_have_bonus > 0 ? (
                                    <div>
                                      <strong>Бонус (nice-to-have):</strong>
                                      <p className="muted">+{match.details.nice_to_have_bonus.toFixed(1)} балла</p>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            ) : null}
                          </li>
                        );
                      })}
                  </ul>
                )}
              </div>
              
              <div className="card">
                <h3>Условно подходящие (4-6 баллов)</h3>
                <p className="muted">Рассматриваются при отсутствии лучших кандидатов</p>
                {aiMatches.filter(m => m.score >= 4 && m.score < 7).length === 0 ? (
                  <p className="muted">Кандидатов в этой категории нет</p>
                ) : (
                  <ul className="ai-match-list">
                    {aiMatches
                      .filter(m => m.score >= 4 && m.score < 7)
                      .map((match) => {
                        const candidate = candidates.find(c => c.id === match.candidate_id);
                        return (
                          <li key={match.candidate_id} className="ai-match-item conditional">
                            <div className="match-header">
                              <div>
                                <strong>{candidate?.name ?? "Кандидат"}</strong>
                                <span className="muted"> · {candidate?.role ?? "Роль не указана"}</span>
                              </div>
                              <div className="match-score-badge conditional">
                                {match.score.toFixed(1)}/10
                              </div>
                            </div>
                            <div className="match-details">
                              <div className="detail-row">
                                <span>Навыки:</span>
                                <span>{match.details.skills_match.matched}/{match.details.skills_match.required}</span>
                              </div>
                              <div className="detail-row">
                                <span>Семантика:</span>
                                <span>{Math.round(match.details.semantic_similarity * 100)}%</span>
                              </div>
                            </div>
                            <p className="match-explanation">{match.explanation}</p>
                            {match.needs_review ? (
                              <span className="review-badge">Требует проверки HR</span>
                            ) : null}
                          </li>
                        );
                      })}
                  </ul>
                )}
              </div>
              
              <div className="card">
                <h3>Не подходящие (1-3 балла)</h3>
                <p className="muted">Не соответствуют требованиям вакансии</p>
                {aiMatches.filter(m => m.score < 4).length === 0 ? (
                  <p className="muted">Кандидатов в этой категории нет</p>
                ) : (
                  <ul className="ai-match-list">
                    {aiMatches
                      .filter(m => m.score < 4)
                      .slice(0, 5)
                      .map((match) => {
                        const candidate = candidates.find(c => c.id === match.candidate_id);
                        return (
                          <li key={match.candidate_id} className="ai-match-item unsuitable">
                            <div className="match-header">
                              <div>
                                <strong>{candidate?.name ?? "Кандидат"}</strong>
                                <span className="muted"> · {candidate?.role ?? "Роль не указана"}</span>
                              </div>
                              <div className="match-score-badge unsuitable">
                                {match.score.toFixed(1)}/10
                              </div>
                            </div>
                            <p className="match-explanation">{match.explanation}</p>
                          </li>
                        );
                      })}
                    {aiMatches.filter(m => m.score < 4).length > 5 ? (
                      <li className="muted">
                        ... и еще {aiMatches.filter(m => m.score < 4).length - 5} кандидатов
                      </li>
                    ) : null}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <div className="card">
              <h3>Граф навыков и поиск</h3>
              <p className="muted">
                Нормализация навыков, семантический поиск и объяснимые совпадения.
              </p>
              <div className="timeline">
                <div>
                  <strong>Узлы навыков</strong>
                  <p className="muted">100+ синонимов навыков</p>
                </div>
                <div>
                  <strong>ML алгоритмы</strong>
                  <p className="muted">TF-IDF + BERT embeddings</p>
                </div>
                <div>
                  <strong>Прозрачность</strong>
                  <p className="muted">Объяснение каждой оценки</p>
                </div>
              </div>
              
              <div className="info-banner">
                Выберите вакансию выше и нажмите "Запустить AI-анализ" для автоматического подбора кандидатов
              </div>
            </div>
          )}
        </section>
      ) : null}
 
 
      {activeTab === "analytics" ? (
        <section className="grid">
          <div className="card">
            <h3>Фильтры аналитики</h3>
            <div className="filters">
              <label className="field">
                Отдел
                <select
                  value={analyticsFilters.department}
                  onChange={(event) =>
                    setAnalyticsFilters((prev) => ({
                      ...prev,
                      department: event.target.value
                    }))
                  }
                >
                  {departmentOptions.map((opt) => (
                    <option key={opt}>{opt}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Период
                <select
                  value={analyticsFilters.range}
                  onChange={(event) =>
                    setAnalyticsFilters((prev) => ({
                      ...prev,
                      range: event.target.value
                    }))
                  }
                >
                  <option>Последние 30 дней</option>
                  <option>Последние 90 дней</option>
                  <option>Год к дате</option>
                </select>
              </label>
            </div>
            <p className="muted">
              Отображаются данные по: {analyticsFilters.department} ·{" "}
              {analyticsFilters.range}
            </p>
          </div>
          <div className="card">
            <h3>Конструктор дашборда</h3>
            <p className="muted">
              Выберите виджеты для отображения и сохраните набор.
            </p>
            <div className="widget-list">
              {analyticsWidgets.map((widget) => (
                <label className="widget-item" key={widget.id}>
                  <input
                    type="checkbox"
                    checked={enabledWidgets.includes(widget.id)}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setEnabledWidgets((prev) =>
                        checked
                          ? [...prev, widget.id]
                          : prev.filter((item) => item !== widget.id)
                      );
                    }}
                  />
                  {widget.label}
                </label>
              ))}
            </div>
            <div className="widget-preview">
              <strong>Предпросмотр набора</strong>
              <div className="widget-preview-grid">
                {enabledWidgets.length === 0 ? (
                  <span className="muted">Выберите хотя бы один виджет</span>
                ) : (
                  enabledWidgets.map((widgetId) => {
                    const widget = analyticsWidgets.find(
                      (item) => item.id === widgetId
                    );
                    return (
                      <span className="widget-chip" key={widgetId}>
                        {widget?.label ?? widgetId}
                      </span>
                    );
                  })
                )}
              </div>
            </div>
            <button className="primary-btn">Сохранить набор</button>
          </div>
          {enabledWidgets.includes("kpis") ? (
            <div className="card">
              <h3>KPI карточки</h3>
              <section className="kpi-grid">
                {analyticsKpis.map((kpi) => (
                  <div className="card" key={kpi.label}>
                    <p className="card-label">{kpi.label}</p>
                    <h2>{kpi.value}</h2>
                  </div>
                ))}
              </section>
            </div>
          ) : null}
          {enabledWidgets.includes("pipeline") ? (
            <div className="card">
              <h3>Воронка найма</h3>
              <ul className="funnel">
                {analyticsStages.map((stage) => (
                  <li key={stage.label}>
                    <span>{stage.label}</span>
                    <span>{stage.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {enabledWidgets.includes("time") && analyticsChartData["time-to-hire"].data.length > 0 ? (
            <div className="card">
              <h3>{analyticsChartData["time-to-hire"].title}</h3>
              <div className="chart">
                {analyticsChartData["time-to-hire"].data.map((item) => {
                  const maxVal = Math.max(...analyticsChartData["time-to-hire"].data.map((d) => d.value), 1);
                  return (
                    <div className="chart-row" key={item.label}>
                      <span className="muted">{item.label}</span>
                      <div className="chart-bar">
                        <span style={{ width: `${(item.value / maxVal) * 100}%` }} />
                      </div>
                      <strong>{item.value}</strong>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : enabledWidgets.includes("time") ? (
            <div className="card">
              <h3>{analyticsChartData["time-to-hire"].title}</h3>
              <p className="muted">Данных пока нет</p>
            </div>
          ) : null}
          {enabledWidgets.includes("sources") && analyticsChartData["source-quality"].data.length > 0 ? (
            <div className="card">
              <h3>{analyticsChartData["source-quality"].title}</h3>
              <div className="chart">
                {analyticsChartData["source-quality"].data.map((item) => (
                  <div className="chart-row" key={item.label}>
                    <span className="muted">{item.label}</span>
                    <div className="chart-bar">
                      <span style={{ width: `${item.value}%` }} />
                    </div>
                    <strong>{item.value}%</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : enabledWidgets.includes("sources") ? (
            <div className="card">
              <h3>{analyticsChartData["source-quality"].title}</h3>
              <p className="muted">Данных пока нет</p>
            </div>
          ) : null}
          {enabledWidgets.includes("conversion") && analyticsChartData["stage-conversion"].data.some((d) => d.value > 0) ? (
            <div className="card">
              <h3>{analyticsChartData["stage-conversion"].title}</h3>
              <div className="chart">
                {analyticsChartData["stage-conversion"].data.map((item) => (
                  <div className="chart-row" key={item.label}>
                    <span className="muted">{item.label}</span>
                    <div className="chart-bar">
                      <span style={{ width: `${item.value}%` }} />
                    </div>
                    <strong>{item.value}%</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : enabledWidgets.includes("conversion") ? (
            <div className="card">
              <h3>{analyticsChartData["stage-conversion"].title}</h3>
              <p className="muted">Данных пока нет</p>
            </div>
          ) : null}
        </section>
      ) : null}
 
      {activeTab === "integrations" ? (
        <section className="grid">
          <div className="card">
            <h3>Интеграции</h3>
            <p className="muted" style={{ marginBottom: "1rem" }}>
              Подключите API ключи сервисов. После подключения вакансии и кандидаты автоматически синхронизируются в общую воронку.
            </p>
            <ul className="funnel">
              {integrationsList.map((integration) => (
                <li key={integration.service}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span>{INTEGRATION_LABELS[integration.service] ?? integration.service}</span>
                    {integration.lastSyncAt ? (
                      <span className="muted" style={{ fontSize: "0.85rem" }}>
                        Синхр.: {new Date(integration.lastSyncAt).toLocaleString("ru-RU")}
                      </span>
                    ) : null}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {integration.hasKey ? (
                      <>
                        <span className={pillClass(integration.status === "connected" ? "Подключено" : integration.status)}>
                          {integration.status === "connected" ? "Подключено" : integration.status}
                        </span>
                        <button
                          className="secondary-btn"
                          type="button"
                          onClick={() => handleIntegrationSync(integration.service)}
                          disabled={integrationSyncLoading === integration.service}
                        >
                          {integrationSyncLoading === integration.service ? "Синхронизация..." : "Синхронизировать"}
                        </button>
                        <button
                          className="secondary-btn"
                          type="button"
                          onClick={() => handleIntegrationDisconnect(integration.service)}
                        >
                          Отключить
                        </button>
                      </>
                    ) : (
                      <button
                        className="primary-btn"
                        type="button"
                        onClick={() => {
                          setSelectedIntegrationService(integration.service);
                          setIntegrationApiKey("");
                          setShowIntegrationModal(true);
                        }}
                      >
                        Подключить
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="card">
            <h3>API ключи</h3>
            <p className="muted">
              Укажите API ключ или токен доступа для каждого сервиса. Ключи хранятся в зашифрованном виде. После подключения нажмите «Синхронизировать», чтобы импортировать вакансии и кандидатов в общую воронку.
            </p>
            <button
              className="secondary-btn"
              type="button"
              onClick={() => {
                setSelectedIntegrationService(integrationsList[0]?.service ?? "hh_ru");
                setIntegrationApiKey("");
                setShowIntegrationModal(true);
              }}
            >
              Добавить API ключ
            </button>
          </div>
        </section>
      ) : null}

      {activeTab === "tariff" ? (
        <section className="grid">
          <div className="card" style={{ gridColumn: "1 / -1" }}>
            <h3>Тариф и оплата</h3>
            {subscription ? (
              <p className="muted">
                Текущий тариф: <strong>{subscription.plan.name}</strong>
                {subscription.subscription.status === "trial" && subscription.subscription.trial_ends_at && (
                  <> · Пробный период до {new Date(subscription.subscription.trial_ends_at).toLocaleDateString("ru-RU")}</>
                )}
              </p>
            ) : (
              <p className="muted">Загрузка тарифа...</p>
            )}
          </div>
          {plans.length > 0 && plans.map((plan) => (
            <div key={plan.id} className="card">
              <h4>{plan.name}</h4>
              <p>
                <strong>{plan.price_monthly === 0 ? "Бесплатно" : `₽${plan.price_monthly}/мес`}</strong>
                {plan.price_yearly != null && plan.price_yearly > 0 && (
                  <span className="muted"> · {plan.price_yearly} ₽/год</span>
                )}
              </p>
              <ul className="funnel">
                <li>Вакансий: {plan.limit_vacancies}</li>
                <li>Кандидатов: {plan.limit_candidates}</li>
                <li>ИИ-матчинг: {plan.ai_matching_enabled ? "Да" : "Нет"}</li>
                <li>Пользователей: {plan.limit_users === -1 ? "∞" : plan.limit_users}</li>
                {plan.priority_support && <li>Приоритетная поддержка</li>}
              </ul>
              {subscription?.plan.slug === plan.slug && (
                <span className="pill">Текущий тариф</span>
              )}
              {subscription?.plan.slug !== plan.slug && (plan.price_monthly === 0 ? null : (
                <button
                  type="button"
                  className="secondary-btn"
                  style={{ marginTop: "8px" }}
                  onClick={() => window.alert("Оплата: выберите способ оплаты (карта, СБП). Демо-режим — оплата подключается отдельно.")}
                >
                  Оплатить
                </button>
              ))}
            </div>
          ))}
        </section>
      ) : null}
 
      {activeTab === "admin" && isAdmin ? (
        <>
          <section className="grid">
            <div className="card">
              <h3>Администрирование</h3>
              <ul className="funnel">
                {adminControls.map((control) => (
                  <li key={control.title}>
                    <span>
                      {control.title}
                      <span className="muted"> · {control.description}</span>
                    </span>
                    <span className={pillClass(control.status)}>
                      {control.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card">
              <h3>Безопасность</h3>
              <p className="muted">
                Шифрование данных, аудит доступа, журналирование, требования GDPR.
              </p>
              <button className="secondary-btn">Открыть журнал аудита</button>
            </div>
          </section>

          <section className="grid">
            <div className="card">
              <h3>Чаты поддержки</h3>
              <p className="muted">
                Список обращений пользователей. Выберите чат для ответа.
              </p>
              <ul className="funnel">
                {adminChats.length === 0 ? (
                  <p className="muted">Обращений пока нет</p>
                ) : (
                  adminChats.map((chat) => (
                    <li
                      key={chat.userId}
                      onClick={() => setSelectedChatUserId(chat.userId)}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="list-main">
                        <span>
                          {chat.userName}
                          <span className="muted"> · {chat.userEmail}</span>
                        </span>
                        <span className="muted">
                          {chat.lastMessage?.content.slice(0, 50)}
                          {chat.lastMessage && chat.lastMessage.content.length > 50
                            ? "..."
                            : ""}
                        </span>
                      </div>
                      <span className="pill">
                        {chat.messages.length} сообщ.
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>

            {selectedChatUserId ? (
              <div className="card">
                <h3>
                  Чат с{" "}
                  {
                    adminChats.find((c) => c.userId === selectedChatUserId)
                      ?.userName
                  }
                </h3>
                <div className="support-chat-body" style={{ maxHeight: "400px" }}>
                  {adminChats
                    .find((c) => c.userId === selectedChatUserId)
                    ?.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`support-message ${
                          msg.sender === "user" ? "user" : "support"
                        }`}
                      >
                        <p>{msg.content}</p>
                        <span className="muted">
                          {new Date(msg.timestamp).toLocaleTimeString("ru-RU", {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                    ))}
                </div>
                <form className="form-grid" onSubmit={handleAdminReply}>
                  <label className="field">
                    Ваш ответ
                    <textarea
                      rows={3}
                      value={adminReplyInput}
                      onChange={(event) => setAdminReplyInput(event.target.value)}
                      placeholder="Напишите ответ пользователю..."
                      required
                    />
                  </label>
                  <button className="primary-btn" type="submit">
                    Отправить
                  </button>
                </form>
              </div>
            ) : null}
          </section>
        </>
      ) : null}
 
 
      {showIntegrationModal && selectedIntegrationService ? (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h3>Подключить {INTEGRATION_LABELS[selectedIntegrationService] ?? selectedIntegrationService}</h3>
              <button
                className="secondary-btn"
                type="button"
                onClick={() => {
                  setShowIntegrationModal(false);
                  setSelectedIntegrationService(null);
                  setIntegrationApiKey("");
                }}
              >
                ×
              </button>
            </div>
            <form className="modal-body" onSubmit={handleIntegrationConnect}>
              <label className="field">
                API ключ или токен доступа
                <input
                  type="password"
                  value={integrationApiKey}
                  onChange={(e) => setIntegrationApiKey(e.target.value)}
                  placeholder="Введите API ключ..."
                  required
                />
              </label>
              <p className="muted" style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}>
                Ключ будет сохранён в зашифрованном виде. После подключения нажмите «Синхронизировать» в списке интеграций, чтобы импортировать вакансии и кандидатов.
              </p>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                <button className="primary-btn" type="submit" disabled={integrationConnectLoading}>
                  {integrationConnectLoading ? "Подключение..." : "Подключить"}
                </button>
                <button
                  className="secondary-btn"
                  type="button"
                  onClick={() => {
                    setShowIntegrationModal(false);
                    setSelectedIntegrationService(null);
                    setIntegrationApiKey("");
                  }}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showVacancyModal ? (
        <div className="modal-backdrop">
          <div className="modal modal-vacancy">
            <div className="modal-header">
              <h3>
                {editingVacancyId ? "Редактировать вакансию" : "Создать вакансию"}
              </h3>
              <button
                className="secondary-btn"
                onClick={() => {
                  setShowVacancyModal(false);
                  setEditingVacancyId(null);
                }}
                type="button"
              >
                ×
              </button>
            </div>
            <form className="modal-body" onSubmit={handleVacancySubmit}>
              <div className="vacancy-section">
                <label className="field">
                  Название вакансии
                  <input
                    type="text"
                    value={vacancyForm.title}
                    onChange={(e) => setVacancyForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Senior Product Manager"
                    required
                  />
                </label>
                <label className="field">
                  Отдел
                  <input
                    type="text"
                    value={vacancyForm.department}
                    onChange={(e) => setVacancyForm((prev) => ({ ...prev, department: e.target.value }))}
                    placeholder="Продукт"
                    required
                  />
                </label>
                <label className="field">
                  Локация
                  <input
                    type="text"
                    value={vacancyForm.location}
                    onChange={(e) => setVacancyForm((prev) => ({ ...prev, location: e.target.value }))}
                    placeholder="Удалённо"
                    required
                  />
                </label>
              </div>

              <div className="vacancy-section">
                <h4>Какой сотрудник нужен</h4>
                <div className="segment-group">
                  {(["permanent", "temporary"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={vacancyForm.employeeType === v ? "segment-btn active" : "segment-btn"}
                      onClick={() => setVacancyForm((prev) => ({ ...prev, employeeType: v }))}
                    >
                      {v === "permanent" ? "Постоянный" : "Временный"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="vacancy-section">
                <h4>Тип занятости</h4>
                <div className="segment-group">
                  {(["full", "part", "shift"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={vacancyForm.employmentType === v ? "segment-btn active" : "segment-btn"}
                      onClick={() => setVacancyForm((prev) => ({ ...prev, employmentType: v }))}
                    >
                      {v === "full" ? "Полная" : v === "part" ? "Частичная" : "Вахта"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="vacancy-section">
                <h4>Формат работы</h4>
                <div className="chip-group">
                  {[
                    { id: "on_site", label: "На месте работодателя" },
                    { id: "remote", label: "Удалённо" },
                    { id: "hybrid", label: "Гибрид" },
                    { id: "mobile", label: "Разъездной" }
                  ].map(({ id, label }) => (
                    <label key={id} className="chip-label">
                      <input
                        type="checkbox"
                        checked={vacancyForm.workFormat.includes(id)}
                        onChange={(e) => {
                          setVacancyForm((prev) => ({
                            ...prev,
                            workFormat: e.target.checked
                              ? [...prev.workFormat, id]
                              : prev.workFormat.filter((x) => x !== id)
                          }));
                        }}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="vacancy-section">
                <h4>Оформление сотрудника</h4>
                <p className="muted small">Можно указать, чтобы собрать более подходящие отклики</p>
                <div className="toggle-rows">
                  <label className="toggle-row">
                    <span><strong>Трудовой договор</strong></span>
                    <span className="muted small">С отпускными, больничными и другими соцгарантиями</span>
                    <input
                      type="checkbox"
                      checked={vacancyForm.laborContract}
                      onChange={(e) => setVacancyForm((prev) => ({ ...prev, laborContract: e.target.checked }))}
                    />
                  </label>
                  <label className="toggle-row">
                    <span><strong>Стажировка</strong></span>
                    <span className="muted small">Практика и обучение для начинающих</span>
                    <input
                      type="checkbox"
                      checked={vacancyForm.internship}
                      onChange={(e) => setVacancyForm((prev) => ({ ...prev, internship: e.target.checked }))}
                    />
                  </label>
                  <label className="toggle-row">
                    <span><strong>Договор ГПХ</strong></span>
                    <span className="muted small">С оплатой только за результат</span>
                    <input
                      type="checkbox"
                      checked={vacancyForm.gph}
                      onChange={(e) => setVacancyForm((prev) => ({ ...prev, gph: e.target.checked }))}
                    />
                  </label>
                  {vacancyForm.gph && (
                    <div className="chip-group indent">
                      {[
                        { key: "gphSelfEmployed", label: "с самозанятым" },
                        { key: "gphIE", label: "с ИП" },
                        { key: "gphIndividual", label: "с физлицом" }
                      ].map(({ key, label }) => (
                        <label key={key} className="chip-label">
                          <input
                            type="checkbox"
                            checked={vacancyForm[key as keyof typeof vacancyForm] as boolean}
                            onChange={(e) => setVacancyForm((prev) => ({ ...prev, [key]: e.target.checked }))}
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="vacancy-section">
                <h4>График и часы работы</h4>
                <p className="muted small">График работы — как чередуются рабочие и выходные дни</p>
                <div className="chip-group">
                  {["6/1", "5/2", "4/4", "4/3", "4/2", "3/3", "3/2", "2/2", "2/1", "1/3", "1/2", "По выходным", "Свободный", "Другое"].map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={vacancyForm.schedule.includes(v) ? "chip active" : "chip"}
                      onClick={() =>
                        setVacancyForm((prev) => ({
                          ...prev,
                          schedule: prev.schedule.includes(v)
                            ? prev.schedule.filter((item) => item !== v)
                            : [...prev.schedule, v]
                        }))
                      }
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <p className="muted small vacancy-subtitle">Рабочие часы в день</p>
                <div className="chip-group">
                  {["2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "24", "По договорённости", "Другое"].map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={vacancyForm.scheduleHoursPerDay.includes(v) ? "chip active" : "chip"}
                      onClick={() =>
                        setVacancyForm((prev) => ({
                          ...prev,
                          scheduleHoursPerDay: prev.scheduleHoursPerDay.includes(v)
                            ? prev.scheduleHoursPerDay.filter((item) => item !== v)
                            : [...prev.scheduleHoursPerDay, v]
                        }))
                      }
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <label className="toggle-row mt-8">
                  <span>Есть вечерние или ночные смены</span>
                  <input
                    type="checkbox"
                    checked={vacancyForm.nightShifts}
                    onChange={(e) => setVacancyForm((prev) => ({ ...prev, nightShifts: e.target.checked }))}
                  />
                </label>
              </div>

              <div className="vacancy-section">
                <h4>Город публикации и адрес работы</h4>
                <p className="muted small">Вакансию увидят люди, которые там живут или готовы туда переехать</p>
                <label className="field">
                  Город публикации
                  <input
                    type="text"
                    value={vacancyForm.cityInput}
                    placeholder="Укажите один или несколько"
                    onChange={(e) => setVacancyForm((prev) => ({ ...prev, cityInput: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && vacancyForm.cityInput.trim()) {
                        e.preventDefault();
                        setVacancyForm((prev) => ({
                          ...prev,
                          publicationCities: [...prev.publicationCities, prev.cityInput.trim()],
                          cityInput: ""
                        }));
                      }
                    }}
                  />
                </label>
                {vacancyForm.publicationCities.length > 0 && (
                  <div className="chip-group">
                    {vacancyForm.publicationCities.map((city) => (
                      <span key={city} className="chip">
                        {city}
                        <button
                          type="button"
                          onClick={() => setVacancyForm((prev) => ({ ...prev, publicationCities: prev.publicationCities.filter((c) => c !== city) }))}
                          aria-label="Удалить"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <label className="field">
                  Адрес работы
                  <input
                    type="text"
                    value={vacancyForm.workAddress}
                    onChange={(e) => setVacancyForm((prev) => ({ ...prev, workAddress: e.target.value }))}
                    placeholder="Улица, дом, офис"
                  />
                </label>
              </div>

              <div className="vacancy-section">
                <h4>Оплата работы</h4>
                <div className="field-row">
                  <label className="field">
                    от
                    <input
                      type="text"
                      inputMode="numeric"
                      value={vacancyForm.salaryFrom}
                      onChange={(e) => setVacancyForm((prev) => ({ ...prev, salaryFrom: e.target.value }))}
                      placeholder="0"
                    />
                  </label>
                  <label className="field">
                    до
                    <input
                      type="text"
                      inputMode="numeric"
                      value={vacancyForm.salaryTo}
                      onChange={(e) => setVacancyForm((prev) => ({ ...prev, salaryTo: e.target.value }))}
                      placeholder="0"
                    />
                  </label>
                  <label className="field">
                    <select
                      value={vacancyForm.salaryCurrency}
                      onChange={(e) => setVacancyForm((prev) => ({ ...prev, salaryCurrency: e.target.value }))}
                    >
                      <option value="RUB">₽</option>
                      <option value="USD">$</option>
                      <option value="EUR">€</option>
                    </select>
                  </label>
                  <label className="field">
                    <select
                      value={vacancyForm.salaryPeriod}
                      onChange={(e) => setVacancyForm((prev) => ({ ...prev, salaryPeriod: e.target.value }))}
                    >
                      <option value="month">За месяц</option>
                      <option value="day">За день</option>
                      <option value="project">За проект</option>
                    </select>
                  </label>
                </div>
                <div className="segment-group mt-8">
                  <button
                    type="button"
                    className={vacancyForm.salaryTax === "gross" ? "segment-btn active" : "segment-btn"}
                    onClick={() => setVacancyForm((prev) => ({ ...prev, salaryTax: "gross" }))}
                  >
                    До вычета налогов
                  </button>
                  <button
                    type="button"
                    className={vacancyForm.salaryTax === "net" ? "segment-btn active" : "segment-btn"}
                    onClick={() => setVacancyForm((prev) => ({ ...prev, salaryTax: "net" }))}
                  >
                    На руки
                  </button>
                </div>
                <p className="muted small vacancy-subtitle">Частота выплат</p>
                <div className="chip-group">
                  {["Ежедневно", "Раз в неделю", "Два раза в месяц", "Раз в месяц", "За проект"].map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={vacancyForm.paymentFrequency === v ? "chip active" : "chip"}
                      onClick={() => setVacancyForm((prev) => ({ ...prev, paymentFrequency: v }))}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="vacancy-section">
                <h4>Описание вакансии</h4>
                <p className="muted small">Условия труда, обязанности, требования</p>
                <label className="field">
                  <textarea
                    rows={6}
                    value={vacancyForm.description}
                    onChange={(e) => setVacancyForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Обязанности:&#10;— &#10;Требования:&#10;— &#10;Условия:&#10;—"
                  />
                </label>
              </div>

              <div className="vacancy-section">
                <h4>Навыки</h4>
                <label className="field">
                  <input
                    type="text"
                    value={vacancyForm.skills.join(", ")}
                    onChange={(e) => setVacancyForm((prev) => ({ ...prev, skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))}
                    placeholder="Найдите или напишите свой вариант (через запятую)"
                  />
                </label>
              </div>

              <div className="vacancy-section">
                <label className="field">
                  Уровень
                  <select
                    value={vacancyForm.level}
                    onChange={(e) => setVacancyForm((prev) => ({ ...prev, level: e.target.value }))}
                  >
                    <option>Junior</option>
                    <option>Middle</option>
                    <option>Senior</option>
                    <option>Lead</option>
                  </select>
                </label>
                <label className="field">
                  Статус
                  <select
                    value={vacancyForm.status}
                    onChange={(e) => setVacancyForm((prev) => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="open">Открыта</option>
                    <option value="paused">Приостановлена</option>
                    <option value="closed">Закрыта</option>
                  </select>
                </label>
              </div>

              <div className="modal-actions">
                <button className="primary-btn" type="submit">
                  {editingVacancyId ? "Сохранить" : "Добавить"}
                </button>
                <button
                  className="secondary-btn"
                  type="button"
                  onClick={() => {
                    setShowVacancyModal(false);
                    setEditingVacancyId(null);
                  }}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
 
      {showCandidateModal ? (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h3>
                {editingCandidateId ? "Редактировать кандидата" : "Добавить кандидата"}
              </h3>
              <button
                className="secondary-btn"
                onClick={() => {
                  setShowCandidateModal(false);
                  setEditingCandidateId(null);
                }}
                type="button"
              >
                ×
              </button>
            </div>
            <form className="modal-body" onSubmit={handleCandidateSubmit}>
              <label className="field">
                Имя и фамилия
                <input
                  type="text"
                  value={candidateForm.name}
                  onChange={(event) =>
                    setCandidateForm((prev) => ({
                      ...prev,
                      name: event.target.value
                    }))
                  }
                  placeholder="Анна Иванова"
                  required
                />
              </label>
              <label className="field">
                Роль
                <input
                  type="text"
                  value={candidateForm.role}
                  onChange={(event) =>
                    setCandidateForm((prev) => ({
                      ...prev,
                      role: event.target.value
                    }))
                  }
                  placeholder="Аналитик"
                  required
                />
              </label>
              <label className="field">
                Этап
                <select
                  value={candidateForm.stage}
                  onChange={(event) =>
                    setCandidateForm((prev) => ({
                      ...prev,
                      stage: event.target.value
                    }))
                  }
                >
                  {stageOrder.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Источник
                <input
                  type="text"
                  value={candidateForm.source}
                  onChange={(event) =>
                    setCandidateForm((prev) => ({
                      ...prev,
                      source: event.target.value
                    }))
                  }
                  placeholder="HH.ru"
                />
              </label>
              <label className="field">
                Примечания
                <textarea
                  rows={3}
                  value={candidateForm.notes}
                  onChange={(event) =>
                    setCandidateForm((prev) => ({
                      ...prev,
                      notes: event.target.value
                    }))
                  }
                  placeholder="Комментарий рекрутера"
                />
              </label>
              <div className="modal-actions">
                <button className="primary-btn" type="submit">
                  {editingCandidateId ? "Сохранить" : "Добавить"}
                </button>
                <button
                  className="secondary-btn"
                  type="button"
                  onClick={() => {
                    setShowCandidateModal(false);
                    setEditingCandidateId(null);
                  }}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showEventModal ? (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h3>Создать напоминание</h3>
              <button
                className="secondary-btn"
                onClick={() => setShowEventModal(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <form className="modal-body" onSubmit={handleEventSubmit}>
              <label className="field">
                Название
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(event) =>
                    setEventForm((prev) => ({
                      ...prev,
                      title: event.target.value
                    }))
                  }
                  placeholder="Интервью с кандидатом"
                  required
                />
              </label>
              <label className="field">
                Дата
                <input
                  type="date"
                  value={eventForm.date}
                  onChange={(event) =>
                    setEventForm((prev) => ({
                      ...prev,
                      date: event.target.value
                    }))
                  }
                  required
                />
              </label>
              <label className="field">
                Время
                <input
                  type="time"
                  value={eventForm.time}
                  onChange={(event) =>
                    setEventForm((prev) => ({
                      ...prev,
                      time: event.target.value
                    }))
                  }
                  required
                />
              </label>
              <label className="field">
                Участники
                <input
                  type="text"
                  value={eventForm.participants}
                  onChange={(event) =>
                    setEventForm((prev) => ({
                      ...prev,
                      participants: event.target.value
                    }))
                  }
                  placeholder="HR команда"
                  required
                />
              </label>
              <label className="field">
                Статус
                <select
                  value={eventForm.status}
                  onChange={(event) =>
                    setEventForm((prev) => ({
                      ...prev,
                      status: event.target.value
                    }))
                  }
                >
                  <option>Запланировано</option>
                  <option>В работе</option>
                  <option>Подтверждено</option>
                  <option>Отменено</option>
                </select>
              </label>
              {eventForm.candidateId ? (
                <div className="field">
                  <strong>Связано с кандидатом</strong>
                  <p className="muted">
                    {
                      candidates.find((c) => c.id === eventForm.candidateId)
                        ?.name
                    }
                  </p>
                </div>
              ) : null}
              <div className="modal-actions">
                <button className="primary-btn" type="submit">
                  Добавить
                </button>
                <button
                  className="secondary-btn"
                  type="button"
                  onClick={() => setShowEventModal(false)}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showFullReport && aiMatches.length > 0 ? (
        <div className="modal-backdrop">
          <div className="modal modal-wide">
            <div className="modal-header">
              <div>
                <h3>Полный отчет по AI-матчингу</h3>
                <p className="muted">
                  Вакансия: {vacancies.find(v => v.id === selectedVacancyForMatching)?.title || 'N/A'}
                </p>
              </div>
              <button
                className="secondary-btn"
                onClick={() => setShowFullReport(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="report-filters">
                <button
                  className={`filter-chip ${reportFilter === "all" ? "active" : ""}`}
                  onClick={() => setReportFilter("all")}
                >
                  Все ({aiMatches.length})
                </button>
                <button
                  className={`filter-chip ${reportFilter === "suitable" ? "active" : ""}`}
                  onClick={() => setReportFilter("suitable")}
                >
                  Подходящие ({aiMatches.filter(m => m.score >= 7).length})
                </button>
                <button
                  className={`filter-chip ${reportFilter === "conditional" ? "active" : ""}`}
                  onClick={() => setReportFilter("conditional")}
                >
                  Условно ({aiMatches.filter(m => m.score >= 4 && m.score < 7).length})
                </button>
                <button
                  className={`filter-chip ${reportFilter === "unsuitable" ? "active" : ""}`}
                  onClick={() => setReportFilter("unsuitable")}
                >
                  Не подходят ({aiMatches.filter(m => m.score < 4).length})
                </button>
              </div>
              
              <div className="report-table">
                <div className="report-table-header">
                  <span style={{flex: 2}}>Кандидат</span>
                  <span style={{flex: 1, textAlign: "center"}}>Оценка</span>
                  <span style={{flex: 1, textAlign: "center"}}>Навыки</span>
                  <span style={{flex: 1, textAlign: "center"}}>Семантика</span>
                  <span style={{flex: 1, textAlign: "center"}}>Опыт</span>
                  <span style={{flex: 1, textAlign: "center"}}>Образование</span>
                  <span style={{flex: 2}}>Статус</span>
                </div>
                {aiMatches
                  .filter(m => {
                    if (reportFilter === "suitable") return m.score >= 7;
                    if (reportFilter === "conditional") return m.score >= 4 && m.score < 7;
                    if (reportFilter === "unsuitable") return m.score < 4;
                    return true;
                  })
                  .map((match, index) => {
                    const candidate = candidates.find(c => c.id === match.candidate_id);
                    const categoryClass = 
                      match.score >= 7 ? "suitable" : 
                      match.score >= 4 ? "conditional" : 
                      "unsuitable";
                    
                    return (
                      <div key={match.candidate_id} className={`report-table-row ${categoryClass}`}>
                        <div style={{flex: 2}}>
                          <div className="report-candidate">
                            <span className="report-rank">#{index + 1}</span>
                            <div>
                              <strong>{candidate?.name || match.candidate_id}</strong>
                              <span className="muted">{candidate?.role || '-'}</span>
                            </div>
                          </div>
                        </div>
                        <div style={{flex: 1, textAlign: "center"}}>
                          <span className={`score-badge ${categoryClass}`}>
                            {match.score.toFixed(1)}
                          </span>
                        </div>
                        <div style={{flex: 1, textAlign: "center"}}>
                          <span className="metric-value">
                            {match.details.skills_match.matched}/{match.details.skills_match.required}
                            {match.details.skills_match.matched >= match.details.skills_match.required ? " Да" : ""}
                          </span>
                        </div>
                        <div style={{flex: 1, textAlign: "center"}}>
                          <span className="metric-value">
                            {Math.round(match.details.semantic_similarity * 100)}%
                          </span>
                        </div>
                        <div style={{flex: 1, textAlign: "center"}}>
                          <span className="metric-value">
                            {Math.round(match.details.experience_match * 100)}%
                          </span>
                        </div>
                        <div style={{flex: 1, textAlign: "center"}}>
                          <span className="metric-value">
                            {match.details.education_match ? "Да" : "Нет"}
                          </span>
                        </div>
                        <div style={{flex: 2}}>
                          <div className="report-actions">
                            <span className={`category-pill ${categoryClass}`}>
                              {match.category}
                            </span>
                            {match.needs_review ? (
                              <span className="needs-review-pill">
                                Проверить
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
              
              <div className="report-footer">
                <div className="report-stats">
                  <div>
                    <strong>Средняя оценка:</strong>
                    <span> {(aiMatches.reduce((sum, m) => sum + m.score, 0) / aiMatches.length).toFixed(1)}/10</span>
                  </div>
                  <div>
                    <strong>Уверенность модели:</strong>
                    <span> {Math.round((aiMatches.reduce((sum, m) => sum + m.confidence, 0) / aiMatches.length) * 100)}%</span>
                  </div>
                  <div>
                    <strong>Требуют проверки:</strong>
                    <span> {aiMatches.filter(m => m.needs_review).length}</span>
                  </div>
                </div>
                
                <div className="modal-actions">
                  <button
                    className="primary-btn"
                    onClick={() => {
                      const selectedVacancy = vacancies.find(v => v.id === selectedVacancyForMatching);
                      const csvContent = [
                        "№,Кандидат,Роль,Оценка,Категория,Навыки (совп/треб),Семантика %,Опыт %,Образование,Уверенность %,Требует проверки,Объяснение",
                        ...aiMatches.map((m, i) => {
                          const cand = candidates.find(c => c.id === m.candidate_id);
                          return `${i+1},"${cand?.name || m.candidate_id}","${cand?.role || '-'}",${m.score},"${m.category}","${m.details.skills_match.matched}/${m.details.skills_match.required}",${Math.round(m.details.semantic_similarity * 100)},${Math.round(m.details.experience_match * 100)},${m.details.education_match ? 'Да' : 'Нет'},${Math.round(m.confidence * 100)},${m.needs_review ? 'Да' : 'Нет'},"${m.explanation.replace(/"/g, '""')}"`;
                        })
                      ].join('\n');
                      
                      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
                      const link = document.createElement('a');
                      link.href = URL.createObjectURL(blob);
                      link.download = `AI_Match_Report_${selectedVacancy?.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
                      link.click();
                    }}
                  >
                    Скачать полный отчет (CSV)
                  </button>
                  <button
                    className="secondary-btn"
                    onClick={() => setShowFullReport(false)}
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showCommModal ? (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h3>
                {editingCommId
                  ? "Редактировать коммуникацию"
                  : "Создать коммуникацию"}
              </h3>
              <button
                className="secondary-btn"
                onClick={() => {
                  setShowCommModal(false);
                  setEditingCommId(null);
                }}
                type="button"
              >
                ×
              </button>
            </div>
            <form className="modal-body" onSubmit={handleCommSubmit}>
              <label className="field">
                Канал
                <select
                  value={commForm.channel}
                  onChange={(event) =>
                    setCommForm((prev) => ({
                      ...prev,
                      channel: event.target.value
                    }))
                  }
                >
                  <option>Email</option>
                  <option>SMS</option>
                  <option>Чат</option>
                  <option>Push</option>
                </select>
              </label>
              <label className="field">
                Шаблон
                <input
                  type="text"
                  value={commForm.template}
                  onChange={(event) =>
                    setCommForm((prev) => ({
                      ...prev,
                      template: event.target.value
                    }))
                  }
                  placeholder="Приглашение на интервью"
                  required
                />
              </label>
              <label className="field">
                Аудитория
                <input
                  type="text"
                  value={commForm.audience}
                  onChange={(event) =>
                    setCommForm((prev) => ({
                      ...prev,
                      audience: event.target.value
                    }))
                  }
                  placeholder="Кандидаты на вакансию X"
                  required
                />
              </label>
              <label className="field">
                Статус
                <select
                  value={commForm.status}
                  onChange={(event) =>
                    setCommForm((prev) => ({
                      ...prev,
                      status: event.target.value
                    }))
                  }
                >
                  <option>Запланировано</option>
                  <option>В работе</option>
                  <option>Готово</option>
                  <option>Отменено</option>
                </select>
              </label>
              <div className="modal-actions">
                <button className="primary-btn" type="submit">
                  {editingCommId ? "Сохранить" : "Добавить"}
                </button>
                <button
                  className="secondary-btn"
                  type="button"
                  onClick={() => {
                    setShowCommModal(false);
                    setEditingCommId(null);
                  }}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {token ? (
        <>
          <button
            className="support-fab"
            onClick={() => setShowSupportChat((prev) => !prev)}
            type="button"
            title="Чат с поддержкой"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>

          {showSupportChat ? (
            <div className="support-chat">
              <div className="support-chat-header">
                <div>
                  <strong>Поддержка Найми</strong>
                  <p className="muted">Онлайн</p>
                </div>
                <button
                  className="secondary-btn"
                  onClick={() => setShowSupportChat(false)}
                  type="button"
                >
                  ×
                </button>
              </div>
              <div className="support-chat-body">
                {supportMessages.length === 0 ? (
                  <p className="muted">
                    Бот поддержки отвечает на базовые вопросы. Задайте вопрос — например, о входе, вакансиях или ИИ-матчинге. Сложные запросы направляются на support.naymi@gmail.com
                  </p>
                ) : (
                  supportMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`support-message ${
                        msg.sender === "user" ? "user" : "support"
                      }`}
                    >
                      <p>{msg.content}</p>
                      <span className="muted">
                        {new Date(msg.timestamp).toLocaleTimeString("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <form className="support-chat-footer" onSubmit={handleSupportSend}>
                <input
                  type="text"
                  value={supportInput}
                  onChange={(event) => setSupportInput(event.target.value)}
                  placeholder="Задайте вопрос — бот ответит или предложит написать на support.naymi@gmail.com"
                  disabled={supportLoading}
                />
                <button
                  className="primary-btn"
                  type="submit"
                  disabled={supportLoading}
                >
                  Отправить
                </button>
              </form>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
    </div>
  );
}
