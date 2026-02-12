import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  Copy,
  FileDown,
  Filter,
  LogOut,
  MessageSquare,
  PhoneCall,
  RefreshCw,
  Search,
  Sheet,
  UserCheck,
  XCircle,
} from 'lucide-react';
import {
  ApiError,
  TOKEN_STORAGE_KEY,
  downloadExportCsv,
  getCurrentUser,
  getMeta,
  login,
  markContactAttempt,
  patchApplication,
  getApplications as loadApplications,
} from './api';
import {
  AdminMeta,
  ApplicationFilters,
  ApplicationStatus,
  ApplicationsResponse,
  AuthUser,
  CandidateApplication,
} from './types';

const DEFAULT_FILTERS: ApplicationFilters = {
  status: [],
  city: '',
  date_from: '',
  date_to: '',
  source: '',
  q: '',
};

const STATUS_BADGE_CLASS: Record<ApplicationStatus, string> = {
  New: 'bg-sky-100 text-sky-800 border-sky-200',
  'In review': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  Contacted: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'No answer': 'bg-amber-100 text-amber-800 border-amber-200',
  'Interview scheduled': 'bg-violet-100 text-violet-800 border-violet-200',
  'Interview passed': 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
  Training: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  'Exam scheduled': 'bg-blue-100 text-blue-800 border-blue-200',
  Approved: 'bg-lime-100 text-lime-800 border-lime-200',
  Rejected: 'bg-rose-100 text-rose-800 border-rose-200',
  Reserve: 'bg-orange-100 text-orange-800 border-orange-200',
};

const formatDateTime = (value: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? '—' : date.toLocaleString('ru-RU');
};

const toLocalDateTimeInput = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const fromLocalDateTimeInput = (value: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
};

const copyToClipboard = async (text: string) => {
  if (!navigator.clipboard) throw new Error('Clipboard API недоступен');
  await navigator.clipboard.writeText(text);
};

interface LoginViewProps {
  onSubmit: (username: string, password: string) => Promise<void>;
  loading: boolean;
  error: string;
}

const LoginView: React.FC<LoginViewProps> = ({ onSubmit, loading, error }) => {
  const [username, setUsername] = useState('tatyana');
  const [password, setPassword] = useState('admin12345');

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-white to-teal-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-stone-200 rounded-3xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-stone-900 mb-2">Вход в админ-кабинет</h1>
        <p className="text-sm text-stone-600 mb-6">Доступ только для сотрудников проекта.</p>
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            await onSubmit(username, password);
          }}
        >
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1" htmlFor="admin-username">
              Логин
            </label>
            <input
              id="admin-username"
              className="w-full rounded-xl border border-stone-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-300"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1" htmlFor="admin-password">
              Пароль
            </label>
            <input
              id="admin-password"
              type="password"
              className="w-full rounded-xl border border-stone-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-300"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm px-3 py-2">{error}</div>
          ) : null}
          <button
            type="submit"
            className="w-full rounded-xl bg-stone-900 text-white py-3 font-semibold hover:bg-stone-800 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Входим...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
};

interface DashboardProps {
  token: string;
  user: AuthUser;
  meta: AdminMeta;
  onLogout: () => void;
  onUnauthorized: () => void;
}

interface DetailDraft {
  status: ApplicationStatus;
  assigned_to: string;
  reject_reason: string;
  reserve_followup_at: string;
  interview_at: string;
  notes: string;
  tags: string;
}

const EMPTY_COUNTERS: ApplicationsResponse['counters'] = {
  New: 0,
  Contacted: 0,
  Approved: 0,
  Rejected: 0,
};

const Dashboard: React.FC<DashboardProps> = ({ token, user, meta, onLogout, onUnauthorized }) => {
  const [filters, setFilters] = useState<ApplicationFilters>(DEFAULT_FILTERS);
  const [items, setItems] = useState<CandidateApplication[]>([]);
  const [counters, setCounters] = useState<ApplicationsResponse['counters']>(EMPTY_COUNTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DetailDraft | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const canEdit = user.role === 'admin';

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) || null,
    [items, selectedId],
  );

  useEffect(() => {
    if (!selected) {
      setDraft(null);
      return;
    }
    setDraft({
      status: selected.status,
      assigned_to: selected.assigned_to || '',
      reject_reason: selected.reject_reason || '',
      reserve_followup_at: toLocalDateTimeInput(selected.reserve_followup_at),
      interview_at: toLocalDateTimeInput(selected.interview_at),
      notes: selected.notes || '',
      tags: (selected.tags || []).join(', '),
    });
  }, [selected]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void (async () => {
        setLoading(true);
        setError('');
        try {
          const response = await loadApplications(token, filters);
          setItems(response.items);
          setCounters(response.counters);
          setLastSyncedAt(new Date().toISOString());
          setSelectedId((current) => {
            if (current && response.items.some((item) => item.id === current)) {
              return current;
            }
            return response.items[0]?.id || null;
          });
        } catch (requestError) {
          if (requestError instanceof ApiError && requestError.status === 401) {
            onUnauthorized();
            return;
          }
          setError(requestError instanceof Error ? requestError.message : 'Ошибка загрузки заявок.');
        } finally {
          setLoading(false);
        }
      })();
    }, 250);
    return () => clearTimeout(timeout);
  }, [filters, onUnauthorized, token, refreshTick]);

  useEffect(() => {
    if (!message) {
      return;
    }
    const timer = window.setTimeout(() => setMessage(''), 3500);
    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        setRefreshTick((value) => value + 1);
      }
    }, 7000);
    return () => window.clearInterval(interval);
  }, []);

  const updateItem = (updated: CandidateApplication) => {
    setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  };

  const handleInlineStatusChange = async (id: string, status: ApplicationStatus) => {
    if (!canEdit) return;
    setActionId(id);
    setError('');
    try {
      const response = await patchApplication(token, id, { status });
      updateItem(response.item);
      setMessage('Статус обновлен.');
      setRefreshTick((value) => value + 1);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось сменить статус.');
    } finally {
      setActionId(null);
    }
  };

  const handleQuickNote = async (item: CandidateApplication) => {
    if (!canEdit) return;
    const value = window.prompt('Добавить заметку', item.notes || '');
    if (value === null) return;
    setActionId(item.id);
    setError('');
    try {
      const response = await patchApplication(token, item.id, { notes: value });
      updateItem(response.item);
      setMessage('Заметка сохранена.');
      setRefreshTick((value) => value + 1);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось сохранить заметку.');
    } finally {
      setActionId(null);
    }
  };

  const handleCopyPhone = async (phone: string) => {
    setError('');
    try {
      await copyToClipboard(phone);
      setMessage(`Телефон скопирован: ${phone}`);
    } catch {
      setError('Не удалось скопировать телефон.');
    }
  };

  const handleSaveDetail = async () => {
    if (!selected || !draft || !canEdit) return;
    setSaving(true);
    setError('');
    try {
      const response = await patchApplication(token, selected.id, {
        status: draft.status,
        assigned_to: draft.assigned_to,
        reject_reason: draft.status === 'Rejected' ? draft.reject_reason : null,
        reserve_followup_at:
          draft.status === 'Reserve' ? fromLocalDateTimeInput(draft.reserve_followup_at) : null,
        interview_at: fromLocalDateTimeInput(draft.interview_at),
        notes: draft.notes,
        tags: draft.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
      updateItem(response.item);
      setMessage('Карточка сохранена.');
      setRefreshTick((value) => value + 1);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось сохранить карточку.');
    } finally {
      setSaving(false);
    }
  };

  const handleContactAction = async (action: 'called' | 'messaged') => {
    if (!selected || !canEdit) return;
    setSaving(true);
    setError('');
    try {
      const response = await markContactAttempt(token, selected.id, action);
      updateItem(response.item);
      setMessage(action === 'called' ? 'Отметка звонка сохранена.' : 'Отметка сообщения сохранена.');
      setRefreshTick((value) => value + 1);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось сохранить действие.');
    } finally {
      setSaving(false);
    }
  };

  const setStatusQuickly = async (status: ApplicationStatus) => {
    if (!selected || !canEdit) return;
    setSaving(true);
    setError('');
    try {
      const patch: Record<string, unknown> = { status };
      if (status === 'Interview scheduled' && !selected.interview_at) {
        patch.interview_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      }
      const response = await patchApplication(token, selected.id, patch);
      updateItem(response.item);
      setMessage(`Статус изменен: ${status}.`);
      setRefreshTick((value) => value + 1);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось обновить статус.');
    } finally {
      setSaving(false);
    }
  };

  const handleExportCsv = async () => {
    if (!canEdit) return;
    setError('');
    try {
      const { blob, filename } = await downloadExportCsv(token, filters);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage('CSV выгружен.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Ошибка при выгрузке CSV.');
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="sticky top-0 z-40 bg-white border-b border-stone-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap gap-3 items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-500">Админ-кабинет заявок</p>
            <h1 className="text-xl font-bold">Кинозритель</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {canEdit ? (
              <button
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-sm font-semibold"
                onClick={() => void handleExportCsv()}
              >
                <FileDown size={16} />
                Export CSV
              </button>
            ) : null}
            {meta.excel_workbook_url ? (
              <a
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-teal-300 bg-teal-50 hover:bg-teal-100 text-sm font-semibold text-teal-800"
                href={meta.excel_workbook_url}
                target="_blank"
                rel="noreferrer"
              >
                <Sheet size={16} />
                Excel
              </a>
            ) : null}
            <button
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-sm font-semibold"
              onClick={() => setRefreshTick((value) => value + 1)}
              disabled={loading}
              title="Обновить список"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Обновить
            </button>
            <span className="text-sm text-stone-600 hidden sm:inline">
              {user.displayName} ({user.role})
            </span>
            <button
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-sm font-semibold"
              onClick={onLogout}
            >
              <LogOut size={16} />
              Выйти
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-4">
        <div className="text-xs text-stone-500">
          Последнее обновление: {formatDateTime(lastSyncedAt)}
        </div>
        {message ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-2 text-sm">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-3 py-2 text-sm">
            {error}
          </div>
        ) : null}

        <section className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={16} />
            <h2 className="font-semibold">Фильтры</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
            <div className="xl:col-span-2">
              <label className="block text-xs font-semibold text-stone-500 mb-1">Статусы</label>
              <select
                multiple
                value={filters.status}
                onChange={(event) => {
                  const values = Array.from(event.target.selectedOptions).map((option) => option.value);
                  setFilters((prev) => ({ ...prev, status: values as ApplicationStatus[] }));
                }}
                className="w-full min-h-[110px] rounded-xl border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
              >
                {meta.statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1">Город</label>
              <input
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                value={filters.city}
                onChange={(event) => setFilters((prev) => ({ ...prev, city: event.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1">Источник UTM</label>
              <input
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                value={filters.source}
                onChange={(event) => setFilters((prev) => ({ ...prev, source: event.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1">Дата с</label>
              <input
                type="date"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                value={filters.date_from}
                onChange={(event) => setFilters((prev) => ({ ...prev, date_from: event.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1">Дата по</label>
              <input
                type="date"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                value={filters.date_to}
                onChange={(event) => setFilters((prev) => ({ ...prev, date_to: event.target.value }))}
              />
            </div>
            <div className="sm:col-span-2 xl:col-span-4">
              <label className="block text-xs font-semibold text-stone-500 mb-1">Поиск по ФИО/телефону</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  className="w-full rounded-xl border border-stone-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                  value={filters.q}
                  onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
                />
              </div>
            </div>
            <div className="sm:col-span-2 xl:col-span-2 flex items-end">
              <button
                className="w-full rounded-xl border border-stone-300 bg-white hover:bg-stone-100 py-2 text-sm font-semibold"
                onClick={() => setFilters(DEFAULT_FILTERS)}
              >
                Сбросить фильтры
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border border-stone-200 rounded-xl p-4">
            <div className="text-xs text-stone-500">New</div>
            <div className="text-2xl font-bold">{counters.New}</div>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl p-4">
            <div className="text-xs text-stone-500">Contacted</div>
            <div className="text-2xl font-bold">{counters.Contacted}</div>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl p-4">
            <div className="text-xs text-stone-500">Approved</div>
            <div className="text-2xl font-bold">{counters.Approved}</div>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl p-4">
            <div className="text-xs text-stone-500">Rejected</div>
            <div className="text-2xl font-bold">{counters.Rejected}</div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1.65fr_1fr] gap-4">
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
            <div className="overflow-auto">
              <table className="min-w-[980px] w-full text-sm">
                <thead className="bg-stone-100 text-stone-600">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">Дата/время</th>
                    <th className="text-left px-3 py-2 font-semibold">ФИО</th>
                    <th className="text-left px-3 py-2 font-semibold">Телефон</th>
                    <th className="text-left px-3 py-2 font-semibold">Город</th>
                    <th className="text-left px-3 py-2 font-semibold">18+</th>
                    <th className="text-left px-3 py-2 font-semibold">Шаги</th>
                    <th className="text-left px-3 py-2 font-semibold">Статус</th>
                    <th className="text-left px-3 py-2 font-semibold">Источник</th>
                    <th className="text-left px-3 py-2 font-semibold">Назначено</th>
                    <th className="text-left px-3 py-2 font-semibold">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="px-3 py-6 text-center text-stone-500" colSpan={10}>
                        Загрузка...
                      </td>
                    </tr>
                  ) : null}
                  {!loading && items.length === 0 ? (
                    <tr>
                      <td className="px-3 py-6 text-center text-stone-500" colSpan={10}>
                        Заявки не найдены.
                      </td>
                    </tr>
                  ) : null}
                  {!loading
                    ? items.map((item) => (
                        <tr
                          key={item.id}
                          className={`border-t border-stone-100 ${
                            selectedId === item.id ? 'bg-teal-50/60' : 'hover:bg-stone-50'
                          }`}
                        >
                          <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(item.created_at)}</td>
                          <td className="px-3 py-2">
                            <div className="font-medium">{item.full_name}</div>
                            {item.duplicate ? (
                              <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 mt-1">
                                duplicate
                              </span>
                            ) : null}
                          </td>
                          <td className="px-3 py-2">
                            <button
                              className="inline-flex items-center gap-1 text-stone-700 hover:text-stone-900"
                              onClick={() => void handleCopyPhone(item.phone)}
                              title="Копировать телефон"
                            >
                              <Copy size={14} />
                              {item.phone}
                            </button>
                          </td>
                          <td className="px-3 py-2">{item.city || '—'}</td>
                          <td className="px-3 py-2">{item.age_18_confirmed ? 'Да' : 'Нет'}</td>
                          <td className="px-3 py-2">
                            <div className="text-xs">S1: {item.step1_confirmed ? 'Да' : 'Нет'}</div>
                            <div className="text-xs">S2: {item.step2_video_watched ? 'Да' : 'Нет'}</div>
                          </td>
                          <td className="px-3 py-2">
                            {canEdit ? (
                              <select
                                className="rounded-lg border border-stone-300 px-2 py-1 text-xs bg-white"
                                value={item.status}
                                onChange={(event) =>
                                  void handleInlineStatusChange(item.id, event.target.value as ApplicationStatus)
                                }
                                disabled={actionId === item.id}
                              >
                                {meta.statuses.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span
                                className={`inline-flex rounded-full px-2 py-1 text-xs border ${
                                  STATUS_BADGE_CLASS[item.status]
                                }`}
                              >
                                {item.status}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">{item.source_utm?.utm_source || '—'}</td>
                          <td className="px-3 py-2">{item.assigned_to || '—'}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <button
                                className="px-2 py-1 rounded-lg border border-stone-300 hover:bg-stone-100 text-xs font-semibold"
                                onClick={() => setSelectedId(item.id)}
                              >
                                Открыть
                              </button>
                              {canEdit ? (
                                <button
                                  className="px-2 py-1 rounded-lg border border-stone-300 hover:bg-stone-100 text-xs font-semibold"
                                  onClick={() => void handleQuickNote(item)}
                                  disabled={actionId === item.id}
                                >
                                  Заметка
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))
                    : null}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5">
            {!selected || !draft ? (
              <div className="text-sm text-stone-500">Выберите заявку из списка.</div>
            ) : (
              <div className="space-y-5">
                <div>
                  <div className="text-xs uppercase tracking-wide text-stone-500 mb-1">Карточка заявки</div>
                  <h3 className="text-lg font-bold">{selected.full_name}</h3>
                  <div className="text-xs text-stone-500">{selected.id}</div>
                </div>
                <section className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <UserCheck size={15} />
                    Контакты
                  </h4>
                  <div className="text-sm">Телефон: {selected.phone}</div>
                  <div className="text-sm">Email: {selected.email || '—'}</div>
                  <div className="text-sm">Город: {selected.city || '—'}</div>
                  <div className="text-sm">
                    18+: {selected.age_18_confirmed ? 'Да' : 'Нет'} | duplicate: {selected.duplicate ? 'Да' : 'Нет'}
                  </div>
                </section>
                <section className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <CheckCircle2 size={15} />
                    Прохождение шагов
                  </h4>
                  <div className="text-sm">Шаг 1: {selected.step1_confirmed ? 'Да' : 'Нет'}</div>
                  <div className="text-sm">Шаг 2: {selected.step2_video_watched ? 'Да' : 'Нет'}</div>
                  <div className="text-sm">Контрольный ответ: {selected.step2_control_answer || '—'}</div>
                  <div className="text-sm">
                    Тест:{' '}
                    {Object.keys(selected.quiz_answers || {}).length > 0
                      ? Object.entries(selected.quiz_answers)
                          .map(([question, answer]) => `${question}: ${answer}`)
                          .join(' | ')
                      : '—'}
                  </div>
                </section>
                <section className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Clock3 size={15} />
                    Статус и решение
                  </h4>
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1">Статус</label>
                    <select
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                      value={draft.status}
                      disabled={!canEdit}
                      onChange={(event) =>
                        setDraft((prev) => (prev ? { ...prev, status: event.target.value as ApplicationStatus } : prev))
                      }
                    >
                      {meta.statuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                  {draft.status === 'Rejected' ? (
                    <div>
                      <label className="block text-xs font-semibold text-stone-500 mb-1">Причина отказа</label>
                      <input
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                        list="reject-reasons"
                        value={draft.reject_reason}
                        disabled={!canEdit}
                        onChange={(event) =>
                          setDraft((prev) => (prev ? { ...prev, reject_reason: event.target.value } : prev))
                        }
                      />
                      <datalist id="reject-reasons">
                        {meta.reject_reasons.map((reason) => (
                          <option key={reason} value={reason} />
                        ))}
                      </datalist>
                    </div>
                  ) : null}
                  {draft.status === 'Reserve' ? (
                    <div>
                      <label className="block text-xs font-semibold text-stone-500 mb-1">Когда вернуться</label>
                      <input
                        type="datetime-local"
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                        value={draft.reserve_followup_at}
                        disabled={!canEdit}
                        onChange={(event) =>
                          setDraft((prev) => (prev ? { ...prev, reserve_followup_at: event.target.value } : prev))
                        }
                      />
                    </div>
                  ) : null}
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1">Дата/время интервью</label>
                    <input
                      type="datetime-local"
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                      value={draft.interview_at}
                      disabled={!canEdit}
                      onChange={(event) =>
                        setDraft((prev) => (prev ? { ...prev, interview_at: event.target.value } : prev))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1">Назначено</label>
                    <input
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                      value={draft.assigned_to}
                      disabled={!canEdit}
                      onChange={(event) =>
                        setDraft((prev) => (prev ? { ...prev, assigned_to: event.target.value } : prev))
                      }
                    />
                  </div>
                  <div className="text-sm">Последний контакт: {formatDateTime(selected.last_contact_at)}</div>
                  <div className="text-sm">Кол-во попыток: {selected.contact_attempts}</div>
                </section>
                <section className="space-y-2">
                  <h4 className="text-sm font-semibold">Заметки Татьяны</h4>
                  <textarea
                    rows={4}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    value={draft.notes}
                    disabled={!canEdit}
                    onChange={(event) =>
                      setDraft((prev) => (prev ? { ...prev, notes: event.target.value } : prev))
                    }
                  />
                  <label className="block text-xs font-semibold text-stone-500 mb-1">Теги (через запятую)</label>
                  <input
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    value={draft.tags}
                    disabled={!canEdit}
                    onChange={(event) =>
                      setDraft((prev) => (prev ? { ...prev, tags: event.target.value } : prev))
                    }
                  />
                </section>
                {canEdit ? (
                  <div className="space-y-2">
                    <button
                      className="w-full rounded-lg bg-stone-900 text-white py-2.5 text-sm font-semibold hover:bg-stone-800 disabled:opacity-60"
                      onClick={() => void handleSaveDetail()}
                      disabled={saving}
                    >
                      Сохранить карточку
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        className="rounded-lg border border-stone-300 py-2 text-xs font-semibold hover:bg-stone-100 inline-flex items-center justify-center gap-1"
                        onClick={() => void handleContactAction('called')}
                        disabled={saving}
                      >
                        <PhoneCall size={14} />
                        Позвонила
                      </button>
                      <button
                        className="rounded-lg border border-stone-300 py-2 text-xs font-semibold hover:bg-stone-100 inline-flex items-center justify-center gap-1"
                        onClick={() => void handleContactAction('messaged')}
                        disabled={saving}
                      >
                        <MessageSquare size={14} />
                        Написала
                      </button>
                      <button
                        className="rounded-lg border border-amber-300 text-amber-800 bg-amber-50 py-2 text-xs font-semibold hover:bg-amber-100 inline-flex items-center justify-center gap-1"
                        onClick={() => void setStatusQuickly('No answer')}
                        disabled={saving}
                      >
                        <XCircle size={14} />
                        Не отвечает
                      </button>
                      <button
                        className="rounded-lg border border-violet-300 text-violet-800 bg-violet-50 py-2 text-xs font-semibold hover:bg-violet-100 inline-flex items-center justify-center gap-1"
                        onClick={() => void setStatusQuickly('Interview scheduled')}
                        disabled={saving}
                      >
                        <CheckCircle2 size={14} />
                        Назначить интервью
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-stone-500 border border-stone-200 rounded-lg px-3 py-2">
                    Режим просмотра: редактирование недоступно.
                  </div>
                )}
              </div>
            )}
          </aside>
        </section>
      </main>
    </div>
  );
};

const AdminApp: React.FC = () => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [meta, setMeta] = useState<AdminMeta | null>(null);
  const [loadingSession, setLoadingSession] = useState(Boolean(token));
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const clearSession = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setMeta(null);
  };

  const hydrateSession = async (sessionToken: string) => {
    const [meResponse, metaResponse] = await Promise.all([
      getCurrentUser(sessionToken),
      getMeta(sessionToken),
    ]);
    setUser(meResponse.user);
    setMeta(metaResponse);
  };

  useEffect(() => {
    if (!token) {
      setLoadingSession(false);
      return;
    }

    let active = true;
    setLoadingSession(true);
    void (async () => {
      try {
        await hydrateSession(token);
      } catch {
        if (active) {
          clearSession();
        }
      } finally {
        if (active) {
          setLoadingSession(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [token]);

  const handleLogin = async (username: string, password: string) => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const response = await login(username, password);
      localStorage.setItem(TOKEN_STORAGE_KEY, response.token);
      setToken(response.token);
      setUser(response.user);
      const metaResponse = await getMeta(response.token);
      setMeta(metaResponse);
    } catch (requestError) {
      setAuthError(requestError instanceof Error ? requestError.message : 'Ошибка входа.');
    } finally {
      setAuthLoading(false);
    }
  };

  if (loadingSession) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center text-stone-600">
        Загрузка сессии...
      </div>
    );
  }

  if (!token || !user || !meta) {
    return <LoginView onSubmit={handleLogin} loading={authLoading} error={authError} />;
  }

  return (
    <Dashboard
      token={token}
      user={user}
      meta={meta}
      onLogout={clearSession}
      onUnauthorized={clearSession}
    />
  );
};

export default AdminApp;
