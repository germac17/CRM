import { useEffect, useMemo, useState, type FormEvent } from "react";
 
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
 
const stageOrder = ["Поиск", "Скрининг", "Интервью", "Оффер", "Найм"];
 
const tabs = [
  { id: "dashboard", label: "Дашборд" },
  { id: "vacancies", label: "Вакансии" },
  { id: "candidates", label: "Кандидаты" },
  { id: "communications", label: "Коммуникации" },
  { id: "calendar", label: "Календарь" },
  { id: "matching", label: "ИИ матчинг" },
  { id: "analytics", label: "Аналитика" },
  { id: "integrations", label: "Интеграции" },
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
 
const communicationQueue = [
  {
    channel: "Email",
    template: "Приглашение на интервью",
    audience: "Кандидаты Дата-сайентист",
    status: "Запланировано"
  },
  {
    channel: "SMS",
    template: "Напоминание о встрече",
    audience: "Интервью сегодня",
    status: "В работе"
  },
  {
    channel: "Чат",
    template: "Старт онбординга",
    audience: "Новые сотрудники",
    status: "Готово"
  }
];
 
 
const analyticsCharts = [
  {
    id: "time-to-hire",
    title: "Срок закрытия вакансий (дни)",
    data: [
      { label: "Продукт", value: 24 },
      { label: "Аналитика", value: 31 },
      { label: "AI/ML", value: 28 },
      { label: "HR", value: 18 }
    ]
  },
  {
    id: "source-quality",
    title: "Эффективность источников (%)",
    data: [
      { label: "HH.ru", value: 42 },
      { label: "LinkedIn", value: 28 },
      { label: "Рефералы", value: 55 },
      { label: "Сайт", value: 21 }
    ]
  },
  {
    id: "stage-conversion",
    title: "Конверсия по этапам (%)",
    data: [
      { label: "Скрининг", value: 65 },
      { label: "Интервью", value: 48 },
      { label: "Оффер", value: 32 },
      { label: "Найм", value: 18 }
    ]
  }
];
 
const integrations = [
  { name: "HH.ru", status: "Подключено" },
  { name: "LinkedIn", status: "Подключено" },
  { name: "Google Workspace", status: "Подключено" },
  { name: "Outlook", status: "В работе" },
  { name: "Slack", status: "Подключено" }
];
 
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(() => getTabFromHash());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
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
  const [matchingForm, setMatchingForm] = useState({
    candidateId: "",
    score: "0.8",
    explanation: ""
  });
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
  const [showVacancyModal, setShowVacancyModal] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [vacancyForm, setVacancyForm] = useState({
    title: "",
    department: "",
    location: "",
    level: "Middle",
    status: "open"
  });
  const [editingVacancyId, setEditingVacancyId] = useState<string | null>(
    null
  );
  const [candidateForm, setCandidateForm] = useState({
    name: "",
    role: "",
    stage: "Скрининг",
    source: "",
    notes: ""
  });
 
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

    const load = async () => {
      setLoading(true);
      try {
        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        };

        const [vacancyRes, candidateRes, matchRes, calendarRes] = await Promise.all([
          fetch(`${apiBase}/vacancies`, { headers }),
          fetch(`${apiBase}/candidates`, { headers }),
          fetch(`${apiBase}/matches`, { headers }),
          fetch(`${apiBase}/calendar`, { headers })
        ]);

        if (!vacancyRes.ok || !candidateRes.ok || !matchRes.ok || !calendarRes.ok) {
          throw new Error("API недоступен.");
        }

        const vacancyJson = (await vacancyRes.json()) as { data: Vacancy[] };
        const candidateJson = (await candidateRes.json()) as {
          data: Candidate[];
        };
        const matchJson = (await matchRes.json()) as { data: Match[] };
        const calendarJson = (await calendarRes.json()) as { data: CalendarEvent[] };

        setVacancies(vacancyJson.data);
        setCandidates(candidateJson.data);
        setMatches(matchJson.data);
        setCalendarEvents(calendarJson.data);
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
  }, [token]);
 
  useEffect(() => {
    const savedToken = localStorage.getItem("hrcrm_token");
    const savedUser = localStorage.getItem("hrcrm_user");
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
    const handleHashChange = () => {
      setActiveTab(getTabFromHash());
    };
 
    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);
 
  const kpis = useMemo(() => {
    const openVacancies = vacancies.filter((vacancy) =>
      vacancy.status.toLowerCase().includes("open")
    ).length;
    
    const matchedCandidates = new Set(matches.map((m) => m.candidateId)).size;

    return [
      { label: "Открытые вакансии", value: String(openVacancies) },
      { label: "Кандидаты в воронке", value: String(candidates.length) },
      { label: "ИИ матчинги", value: String(matchedCandidates) },
      { label: "Всего вакансий", value: String(vacancies.length) }
    ];
  }, [vacancies, candidates, matches]);
 
  const stages = useMemo(() => {
    const base = new Map<string, number>();
    stageOrder.forEach((stage) => base.set(stage, 0));
    candidates.forEach((candidate) => {
      if (base.has(candidate.stage)) {
        base.set(candidate.stage, (base.get(candidate.stage) ?? 0) + 1);
      }
    });
    return Array.from(base.entries()).map(([label, value]) => ({
      label,
      value
    }));
  }, [candidates]);

  const stageStats = useMemo(() => {
    const base = new Map<string, number>();
    candidates.forEach((candidate) => {
      base.set(candidate.stage, (base.get(candidate.stage) ?? 0) + 1);
    });
    return Array.from(base.entries()).map(([label, value]) => ({
      label,
      value
    }));
  }, [candidates]);
 
  const roleStats = useMemo(() => {
    const base = new Map<string, number>();
    candidates.forEach((candidate) => {
      base.set(candidate.role, (base.get(candidate.role) ?? 0) + 1);
    });
    return Array.from(base.entries()).map(([label, value]) => ({
      label,
      value
    }));
  }, [candidates]);
 
  const recommendationCards = useMemo(() => {
    return matches.map((match) => {
      const candidate = candidates.find(
        (item) => item.id === match.candidateId
      );
      return {
        name: candidate?.name ?? match.candidateId,
        role: candidate?.role ?? "Кандидат",
        score: match.score,
        explanation: match.explanation
      };
    });
  }, [matches, candidates]);
 
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
      normalized.includes("крит")
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
    if (activeTab === "admin" && !isAdmin) {
      setActiveTab("dashboard");
      window.location.hash = "tab=dashboard";
    }
  }, [activeTab, isAdmin]);
 
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
      source: "",
      notes: ""
    });
    setShowCandidateModal(true);
  };
 
  const handleCandidateDelete = async (candidateId: string) => {
    const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
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
    const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
    
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
        const json = (await response.json()) as { data: Match };
        setMatches((prev) => [...prev, json.data]);
      }
      setMatchingForm({ candidateId: "", score: "0.8", explanation: "" });
    } catch (err) {
      console.error("Ошибка добавления матча:", err);
    }
  };
 
  const handleMatchDelete = async (candidateId: string) => {
    const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
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
    const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
    
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
        const json = (await response.json()) as { data: CalendarEvent };
        setCalendarEvents((prev) => [...prev, json.data]);
      }
      setShowEventModal(false);
      setEventForm({
        title: "",
        date: "",
        time: "",
        participants: "",
        status: "Запланировано",
        candidateId: ""
      });
    } catch (err) {
      console.error("Ошибка добавления события:", err);
    }
  };

  const handleEventDelete = async (eventId: string) => {
    const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
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
 
  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
 
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
      const json = (await response.json()) as {
        token?: string;
        user?: AuthUser;
        error?: string;
      };
 
      if (!response.ok || !json.token || !json.user) {
        throw new Error(json.error ?? "Ошибка авторизации.");
      }
 
      setToken(json.token);
      setCurrentUser(json.user);
      localStorage.setItem("hrcrm_token", json.token);
      localStorage.setItem("hrcrm_user", JSON.stringify(json.user));
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
 
  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem("hrcrm_token");
    localStorage.removeItem("hrcrm_user");
  };
 
  const handleVacancySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
    
    try {
      if (editingVacancyId) {
        const response = await fetch(`${apiBase}/vacancies/${editingVacancyId}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            title: vacancyForm.title,
            department: vacancyForm.department,
            location: vacancyForm.location,
            status: vacancyForm.status
          })
        });
        
        if (response.ok) {
          const json = (await response.json()) as { data: Vacancy };
          setVacancies((prev) =>
            prev.map((vacancy) =>
              vacancy.id === editingVacancyId ? json.data : vacancy
            )
          );
        }
        setEditingVacancyId(null);
      } else {
        const response = await fetch(`${apiBase}/vacancies`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            title: vacancyForm.title,
            department: vacancyForm.department,
            location: vacancyForm.location,
            status: vacancyForm.status
          })
        });
        
        if (response.ok) {
          const json = (await response.json()) as { data: Vacancy };
          setVacancies((prev) => [...prev, json.data]);
        }
      }
      setShowVacancyModal(false);
      setVacancyForm({
        title: "",
        department: "",
        location: "",
        level: "Middle",
        status: "open"
      });
    } catch (err) {
      console.error("Ошибка сохранения вакансии:", err);
    }
  };
 
  const handleVacancyEdit = (vacancyId: string) => {
    const vacancy = vacancies.find((item) => item.id === vacancyId);
    if (!vacancy) {
      return;
    }
    setEditingVacancyId(vacancyId);
    setVacancyForm({
      title: vacancy.title,
      department: vacancy.department,
      location: vacancy.location,
      level: "Middle",
      status: vacancy.status
    });
    setShowVacancyModal(true);
  };
 
  const handleVacancyDelete = async (vacancyId: string) => {
    const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
    try {
      const response = await fetch(`${apiBase}/vacancies/${vacancyId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (response.ok) {
        setVacancies((prev) => prev.filter((item) => item.id !== vacancyId));
      }
    } catch (err) {
      console.error("Ошибка удаления вакансии:", err);
    }
  };
 
  const handleCandidateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
    
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
            stage: candidateForm.stage
          })
        });
        
        if (response.ok) {
          const json = (await response.json()) as { data: Candidate };
          setCandidates((prev) =>
            prev.map((candidate) =>
              candidate.id === editingCandidateId ? json.data : candidate
            )
          );
        }
        setEditingCandidateId(null);
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
            skills: []
          })
        });
        
        if (response.ok) {
          const json = (await response.json()) as { data: Candidate };
          setCandidates((prev) => [...prev, json.data]);
        }
      }
      setShowCandidateModal(false);
      setCandidateForm({
        name: "",
        role: "",
        stage: "Скрининг",
        source: "",
        notes: ""
      });
    } catch (err) {
      console.error("Ошибка сохранения кандидата:", err);
    }
  };
 
  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div>
            <h1>HR CRM платформа</h1>
            <p className="muted">
              Войдите или зарегистрируйтесь, чтобы продолжить работу.
            </p>
          </div>
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
                required
              />
            </label>
            {authError ? <p className="auth-error">{authError}</p> : null}
            <button className="primary-btn" type="submit" disabled={authLoading}>
              {authLoading
                ? "Подождите..."
                : authMode === "login"
                  ? "Войти"
                  : "Зарегистрироваться"}
            </button>
          </form>
        </div>
      </div>
    );
  }
 
  return (
    <div className="shell">
      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div>
            <strong>HR CRM</strong>
            <p className="muted">Навигация</p>
          </div>
          <button
            className="secondary-btn"
            onClick={() => setIsSidebarOpen(false)}
            type="button"
          >
            ✕
          </button>
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
              <h1>HR CRM платформа</h1>
              <p>Граф навыков и предиктивный матчинг</p>
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
          <section className="kpi-grid">
            {kpis.map((kpi) => (
              <div className="card" key={kpi.label}>
                <p className="card-label">{kpi.label}</p>
                <h2>{kpi.value}</h2>
              </div>
            ))}
          </section>
 
          <section className="grid">
            <div className="card">
              <h3>Воронка найма</h3>
              <ul className="funnel">
                {stages.map((stage) => (
                  <li key={stage.label}>
                    <span>{stage.label}</span>
                    <span>{stage.value}</span>
                  </li>
                ))}
              </ul>
            </div>
 
            <div className="card">
              <h3>Кандидаты по этапам</h3>
              <div className="chart">
                {stageStats.length === 0 ? (
                  <p className="muted">Данных пока нет</p>
                ) : (
                  stageStats.map((item) => (
                    <div className="chart-row" key={item.label}>
                      <span className="muted">{item.label}</span>
                      <div className="chart-bar">
                        <span
                          style={{
                            width: `${Math.min(item.value * 20, 100)}%`
                          }}
                        />
                      </div>
                      <strong>{item.value}</strong>
                    </div>
                  ))
                )}
              </div>
            </div>
 
            <div className="card">
              <h3>ИИ рекомендации</h3>
              {loading ? (
                <p className="muted">Загрузка матчей...</p>
              ) : (
                <ul className="recommendations">
                  {recommendationCards.map((rec) => (
                    <li key={`${rec.name}-${rec.role}`}>
                      <div>
                        <strong>{rec.name}</strong>
                        <span className="muted">{rec.role}</span>
                        <p className="muted">{rec.explanation}</p>
                      </div>
                      <span className="score">
                        {Math.round(rec.score * 100)}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
 
          <section className="grid">
            <div className="card">
              <h3>Кандидаты по ролям</h3>
              <div className="chart">
                {roleStats.length === 0 ? (
                  <p className="muted">Данных пока нет</p>
                ) : (
                  roleStats.map((item) => (
                    <div className="chart-row" key={item.label}>
                      <span className="muted">{item.label}</span>
                      <div className="chart-bar">
                        <span
                          style={{
                            width: `${Math.min(item.value * 20, 100)}%`
                          }}
                        />
                      </div>
                      <strong>{item.value}</strong>
                    </div>
                  ))
                )}
              </div>
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
                setVacancyForm({
                  title: "",
                  department: "",
                  location: "",
                  level: "Middle",
                  status: "open"
                });
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
        <section className="grid">
          <div className="card">
            <h3>Кандидаты в воронке</h3>
            {loading ? (
              <p className="muted">Загрузка кандидатов...</p>
            ) : (
              <ul className="funnel">
                {candidates.map((candidate) => (
                  <li key={candidate.id}>
                    <div className="list-main">
                      <span>
                        {candidate.name}
                        <span className="muted"> · {candidate.stage}</span>
                      </span>
                      <span className="muted">{candidate.role}</span>
                    </div>
                    <div className="list-actions">
                      <button
                        className="calendar-btn"
                        type="button"
                        onClick={() => handleAddCandidateToCalendar(candidate.id)}
                        title="Добавить в календарь"
                      >
                        📅
                      </button>
                      <button
                        className="secondary-btn"
                        type="button"
                        onClick={() => handleCandidateEdit(candidate.id)}
                      >
                        Редактировать
                      </button>
                      <button
                        className="danger-btn"
                        type="button"
                        onClick={() => handleCandidateDelete(candidate.id)}
                      >
                        Удалить
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="card">
            <h3>Кандидатский портал</h3>
            <p className="muted">
              Личный кабинет с подачей заявки, загрузкой резюме, согласием на
              обработку данных и трекингом статуса.
            </p>
            <button
              className="secondary-btn"
              onClick={() => {
                setEditingCandidateId(null);
                setCandidateForm({
                  name: "",
                  role: "",
                  stage: "Скрининг",
                  source: "",
                  notes: ""
                });
                setShowCandidateModal(true);
              }}
            >
              Добавить кандидата
            </button>
            <div className="timeline">
              <div>
                <strong>Статусы заявки</strong>
                <p className="muted">Подача → Скрининг → Интервью → Оффер</p>
              </div>
              <div>
                <strong>Согласия</strong>
                <p className="muted">GDPR и локальные требования</p>
              </div>
            </div>
          </div>
        </section>
      ) : null}
 
      {activeTab === "communications" ? (
        <section className="grid">
          <div className="card">
            <h3>Автоматизированные коммуникации</h3>
            <p className="muted">
              Шаблоны сообщений, расписание и омниканальность: email, чат, SMS.
            </p>
            <ul className="funnel">
              {communicationQueue.map((item) => (
                <li key={`${item.template}-${item.channel}`}>
                  <span>
                    {item.template}
                    <span className="muted"> · {item.channel}</span>
                  </span>
                  <span className={pillClass(item.status)}>{item.status}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card">
            <h3>Сегменты</h3>
            <p className="muted">
              Триггеры по этапам, напоминания и сценарии вовлечения.
            </p>
            <ul className="timeline">
              <li>
                <strong>Интервью сегодня</strong>
                <p className="muted">SMS за 2 часа до встречи</p>
              </li>
              <li>
                <strong>Новые сотрудники</strong>
                <p className="muted">Email о старте онбординга</p>
              </li>
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
            <h3>Граф навыков и поиск</h3>
            <p className="muted">
              Нормализация навыков, семантический поиск и объяснимые совпадения.
            </p>
            <div className="timeline">
              <div>
                <strong>Узлы навыков</strong>
                <p className="muted">1 240 активных навыков</p>
              </div>
              <div>
                <strong>Смещения</strong>
                <p className="muted">Контроль fairness и прозрачность</p>
              </div>
            </div>
          </div>
          <div className="card">
            <h3>Рекомендации кандидатов</h3>
            {loading ? (
              <p className="muted">Загрузка матчей...</p>
            ) : (
              <>
                <ul className="recommendations">
                  {recommendationCards.map((rec) => (
                    <li key={`${rec.name}-${rec.role}`}>
                      <div>
                        <strong>{rec.name}</strong>
                        <span className="muted">{rec.role}</span>
                        <p className="muted">{rec.explanation}</p>
                      </div>
                      <span className="score">
                        {Math.round(rec.score * 100)}%
                      </span>
                    </li>
                  ))}
                </ul>
                <form className="form-grid" onSubmit={handleMatchAdd}>
                  <label className="field">
                    Кандидат
                    <select
                      value={matchingForm.candidateId}
                      onChange={(event) =>
                        setMatchingForm((prev) => ({
                          ...prev,
                          candidateId: event.target.value
                        }))
                      }
                      required
                    >
                      <option value="">Выберите кандидата</option>
                      {candidates.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.name} · {candidate.role}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    Оценка
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={matchingForm.score}
                      onChange={(event) =>
                        setMatchingForm((prev) => ({
                          ...prev,
                          score: event.target.value
                        }))
                      }
                    />
                  </label>
                  <label className="field">
                    Объяснение
                    <input
                      type="text"
                      value={matchingForm.explanation}
                      onChange={(event) =>
                        setMatchingForm((prev) => ({
                          ...prev,
                          explanation: event.target.value
                        }))
                      }
                      placeholder="Почему кандидат подходит"
                    />
                  </label>
                  <div className="modal-actions">
                    <button className="primary-btn" type="submit">
                      Добавить матчинг
                    </button>
                  </div>
                </form>
                <div className="table">
                  <div className="table-header">
                    <span>Кандидат</span>
                    <span>Оценка</span>
                    <span>Действия</span>
                  </div>
                  {matches.map((match) => {
                    const candidate = candidates.find(
                      (item) => item.id === match.candidateId
                    );
                    return (
                      <div className="table-row" key={match.candidateId}>
                        <span>
                          {candidate?.name ?? match.candidateId}
                          <span className="muted">
                            {" "}
                            · {candidate?.role ?? "Кандидат"}
                          </span>
                        </span>
                        <span>{Math.round(match.score * 100)}%</span>
                        <button
                          className="danger-btn"
                          type="button"
                          onClick={() => handleMatchDelete(match.candidateId)}
                        >
                          Удалить
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
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
                  <option>Все отделы</option>
                  <option>Продукт</option>
                  <option>AI/ML</option>
                  <option>HR</option>
                  <option>Аналитика</option>
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
          {analyticsCharts.map((chart) =>
            enabledWidgets.includes("time") &&
            chart.id === "time-to-hire" ? (
              <div className="card" key={chart.id}>
                <h3>{chart.title}</h3>
                <div className="chart">
                  {chart.data.map((item) => (
                    <div className="chart-row" key={item.label}>
                      <span className="muted">{item.label}</span>
                      <div className="chart-bar">
                        <span style={{ width: `${item.value}%` }} />
                      </div>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          )}
          {analyticsCharts.map((chart) =>
            enabledWidgets.includes("sources") &&
            chart.id === "source-quality" ? (
              <div className="card" key={chart.id}>
                <h3>{chart.title}</h3>
                <div className="chart">
                  {chart.data.map((item) => (
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
            ) : null
          )}
          {analyticsCharts.map((chart) =>
            enabledWidgets.includes("conversion") &&
            chart.id === "stage-conversion" ? (
              <div className="card" key={chart.id}>
                <h3>{chart.title}</h3>
                <div className="chart">
                  {chart.data.map((item) => (
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
            ) : null
          )}
        </section>
      ) : null}
 
      {activeTab === "integrations" ? (
        <section className="grid">
          <div className="card">
            <h3>Интеграции</h3>
            <ul className="funnel">
              {integrations.map((integration) => (
                <li key={integration.name}>
                  <span>{integration.name}</span>
                  <span className={pillClass(integration.status)}>
                    {integration.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card">
            <h3>API-first</h3>
            <p className="muted">
              Webhooks, ключи доступа и управление интеграциями партнеров.
            </p>
            <button className="secondary-btn">Управлять API ключами</button>
          </div>
        </section>
      ) : null}
 
      {activeTab === "admin" && isAdmin ? (
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
      ) : null}
 
 
      {showVacancyModal ? (
        <div className="modal-backdrop">
          <div className="modal">
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
                Закрыть
              </button>
            </div>
            <form className="modal-body" onSubmit={handleVacancySubmit}>
              <label className="field">
                Название вакансии
                <input
                  type="text"
                  value={vacancyForm.title}
                  onChange={(event) =>
                    setVacancyForm((prev) => ({
                      ...prev,
                      title: event.target.value
                    }))
                  }
                  placeholder="Senior Product Manager"
                  required
                />
              </label>
              <label className="field">
                Отдел
                <input
                  type="text"
                  value={vacancyForm.department}
                  onChange={(event) =>
                    setVacancyForm((prev) => ({
                      ...prev,
                      department: event.target.value
                    }))
                  }
                  placeholder="Продукт"
                  required
                />
              </label>
              <label className="field">
                Локация
                <input
                  type="text"
                  value={vacancyForm.location}
                  onChange={(event) =>
                    setVacancyForm((prev) => ({
                      ...prev,
                      location: event.target.value
                    }))
                  }
                  placeholder="Удаленно"
                  required
                />
              </label>
              <label className="field">
                Уровень
                <select
                  value={vacancyForm.level}
                  onChange={(event) =>
                    setVacancyForm((prev) => ({
                      ...prev,
                      level: event.target.value
                    }))
                  }
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
                  onChange={(event) =>
                    setVacancyForm((prev) => ({
                      ...prev,
                      status: event.target.value
                    }))
                  }
                >
                  <option value="open">Открыта</option>
                  <option value="paused">Приостановлена</option>
                  <option value="closed">Закрыта</option>
                </select>
              </label>
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
                Закрыть
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
                  <option>Поиск</option>
                  <option>Скрининг</option>
                  <option>Интервью</option>
                  <option>Оффер</option>
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
                Закрыть
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
    </div>
    </div>
  );
}
