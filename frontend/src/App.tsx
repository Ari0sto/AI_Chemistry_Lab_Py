import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Activity, ArrowRight, Atom, BarChart3, Beaker, CheckCircle2, CircleHelp,
  Database, FlaskConical, GitCompareArrows, Github, Layers3, LoaderCircle,
  Menu, Play, Plus, RefreshCw, Server, ShieldCheck, Sparkles, X, XCircle,
} from 'lucide-react';
import { chemistryApi, API_URL } from './api';
import MoleculeForm from './components/MoleculeForm';
import MoleculeTable, { type SortMode } from './components/MoleculeTable';
import ComparisonChart from './components/ComparisonChart';
import type { ExperimentalValue, MoleculeInput, MoleculeResult } from './types';

type Notice = { kind: 'success' | 'error'; text: string } | null;

export default function App() {
  const [results, setResults] = useState<MoleculeResult[]>([]);
  const [samples, setSamples] = useState<MoleculeInput[]>([]);
  const [experiments, setExperiments] = useState<ExperimentalValue[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [experimentalSmiles, setExperimentalSmiles] = useState('');
  const [experimentalValue, setExperimentalValue] = useState('');
  const [experimentalSource, setExperimentalSource] = useState('');

  async function refresh() {
    const [newResults, newExperiments] = await Promise.all([
      chemistryApi.getResults(), chemistryApi.getExperiments(),
    ]);
    setResults(newResults);
    setExperiments(newExperiments);
  }

  useEffect(() => {
    async function init() {
      try {
        const [newResults, newSamples, newExperiments] = await Promise.all([
          chemistryApi.getResults(), chemistryApi.getSamples(), chemistryApi.getExperiments(),
        ]);
        setResults(newResults);
        setSamples(newSamples);
        setExperiments(newExperiments);
      } catch (error) {
        setNotice({ kind: 'error', text: (error as Error).message });
      } finally {
        setInitialLoading(false);
      }
    }
    void init();
  }, []);

  async function handlePredict(data: MoleculeInput) {
    setLoading(true);
    setNotice(null);
    try {
      const result = await chemistryApi.predict(data);
      await refresh();
      setNotice({ kind: 'success', text: `${result.molecule_name}: logS = ${result.predicted_value.toFixed(4)}. Результат сохранён в CSV.` });
    } catch (error) {
      setNotice({ kind: 'error', text: (error as Error).message });
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function handleBatch() {
    if (samples.length === 0) {
      setNotice({ kind: 'error', text: 'В файле data/molecules.csv отсутствуют тестовые молекулы.' });
      return;
    }
    setLoading(true);
    setNotice(null);
    try {
      const report = await chemistryApi.batchPredict(samples);
      await refresh();
      if (report.errors.length) {
        setNotice({
          kind: 'error',
          text: `Успешно: ${report.success.length}. Ошибок: ${report.errors.length}. ${report.errors.slice(0, 2).map((x) => `${x.molecule_name}: ${x.error}`).join(' | ')}`,
        });
      } else {
        setNotice({ kind: 'success', text: `Проанализировано ${report.success.length} веществ. Данные сохранены в chemistry_results.csv.` });
      }
    } catch (error) {
      setNotice({ kind: 'error', text: (error as Error).message });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(smiles: string) {
    if (!window.confirm('Удалить эту молекулу из результатов?')) return;
    setLoading(true);
    try {
      await chemistryApi.delete(smiles);
      setSelected((previous) => { const next = new Set(previous); next.delete(smiles); return next; });
      await refresh();
      setNotice({ kind: 'success', text: 'Запись удалена из chemistry_results.csv.' });
    } catch (error) {
      setNotice({ kind: 'error', text: (error as Error).message });
    } finally {
      setLoading(false);
    }
  }

  function toggleSelection(smiles: string) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(smiles)) next.delete(smiles);
      else next.add(smiles);
      return next;
    });
  }

  async function handleExperimental(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const num = Number(experimentalValue);
    if (!experimentalSmiles || !experimentalValue.trim() || !Number.isFinite(num) || !experimentalSource.trim()) {
      setNotice({ kind: 'error', text: 'Выберите молекулу и укажите числовое значение logS и источник.' });
      return;
    }
    setLoading(true);
    try {
      await chemistryApi.saveExperimental(experimentalSmiles, num, experimentalSource.trim());
      await refresh();
      setExperimentalValue('');
      setExperimentalSource('');
      setNotice({ kind: 'success', text: 'Экспериментальное значение сохранено. Оно отображается на графике сравнения.' });
    } catch (error) {
      setNotice({ kind: 'error', text: (error as Error).message });
    } finally {
      setLoading(false);
    }
  }

  const visible = useMemo(() => {
    const value = query.trim().toLocaleLowerCase();
    const list = results.filter((item) =>
      item.molecule_name.toLocaleLowerCase().includes(value) || item.smiles.toLowerCase().includes(value),
    );
    if (sortMode !== 'newest') {
      list.sort((a, b) => sortMode === 'asc'
        ? a.predicted_value - b.predicted_value
        : b.predicted_value - a.predicted_value);
    }
    return list;
  }, [results, query, sortMode]);

  const compared = results.filter((item) => selected.has(item.smiles));
  const chartMolecules = compared.length > 0 ? compared : results.slice(0, 10);
  const average = results.length
    ? results.reduce((sum, item) => sum + item.predicted_value, 0) / results.length
    : null;
  const minValue = results.length ? Math.min(...results.map((item) => item.predicted_value)) : null;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="logo-area">
          <span className="brand-icon"><Atom size={23} strokeWidth={2.1} /></span>
          <div><strong>AI CHEMISTRY</strong><small>LABORATORY / 1.0</small></div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Закрыть меню"><X size={20} /></button>
        </div>
        <div className="sidebar-divider" />
        <div className="nav-caption">РАБОЧЕЕ ПРОСТРАНСТВО</div>
        <nav className="nav-list" aria-label="Навигация">
          <a href="#overview" className="active" onClick={() => setSidebarOpen(false)}><Layers3 size={19} /> Обзор</a>
          <a href="#analyze" onClick={() => setSidebarOpen(false)}><Beaker size={19} /> Анализ молекул</a>
          <a href="#results" onClick={() => setSidebarOpen(false)}><Database size={19} /> Библиотека</a>
          <a href="#comparison" onClick={() => setSidebarOpen(false)}><BarChart3 size={19} /> Сравнение</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="model-sidebar-card">
            <div className="model-card-head"><span className="pulse-dot" /> МОДЕЛЬ ПОДКЛЮЧЕНА</div>
            <strong>ChemSolubilityBERTa</strong>
            <span>Hugging Face · регрессия</span>
            <a href="https://huggingface.co/khanfs/ChemSolubilityBERTa" target="_blank" rel="noreferrer">О модели <ArrowRight size={14} /></a>
          </div>
          <div className="sidebar-footer"><ShieldCheck size={15} /> Локальная обработка данных</div>
        </div>
      </aside>

      {sidebarOpen && <button className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-label="Закрыть меню" />}
      <main className="main-content" id="overview">
        <div className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Открыть меню"><Menu size={22} /></button>
            <span className="breadcrumbs">Платформа <span>/</span> <strong>Обзор лаборатории</strong></span>
          </div>
          <div className="topbar-right">
            <span className="environment-indicator"><span className="pulse-dot" /> Локальный сервер</span>
            <span className="top-avatar"><FlaskConical size={17} /></span>
          </div>
        </div>

        <div className="page-content">
          <div className="hero">
            <div className="hero-text">
              <div className="eyebrow hero-kicker"><Sparkles size={15} /> ИССЛЕДОВАТЕЛЬСКАЯ ПЛАТФОРМА</div>
              <h1>Исследуйте молекулы.<br /><span>Предсказывайте свойства.</span></h1>
              <p>Интеллектуальный анализ химических соединений на основе SMILES и модели Hugging Face. От структуры — к данным.</p>
              <a className="hero-action" href="#analyze">Начать анализ <ArrowRight size={18} /></a>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="orbit orbit-one" /><div className="orbit orbit-two" />
              <div className="atom-core"><Atom size={92} strokeWidth={1.15} /></div>
              <span className="orbit-node node-1" /><span className="orbit-node node-2" /><span className="orbit-node node-3" />
              <span className="molecule-label label-one">H₂O</span><span className="molecule-label label-two">C₆H₆</span>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card"><div className="stat-label"><span>Проанализировано</span><Database size={19} /></div>
              <strong>{initialLoading ? '—' : results.length}</strong><small>соединений в библиотеке</small></div>
            <div className="stat-card"><div className="stat-label"><span>Средний logS</span><Activity size={19} /></div>
              <strong>{average === null ? '—' : average.toFixed(3)}</strong><small>прогноз по всем молекулам</small></div>
            <div className="stat-card"><div className="stat-label"><span>Минимальный logS</span><ArrowRight size={19} /></div>
              <strong>{minValue === null ? '—' : minValue.toFixed(3)}</strong><small>наименьшая прогнозируемая растворимость</small></div>
            <div className="stat-card accent-stat"><div className="stat-label"><span>Тестовые образцы</span><FlaskConical size={19} /></div>
              <strong>{samples.length || '—'}</strong><small>готовы к пакетному анализу</small></div>
          </div>

          {notice && (
            <div className={`notice ${notice.kind}`} role="alert">
              {notice.kind === 'success' ? <CheckCircle2 size={19} /> : <XCircle size={19} />}
              <span>{notice.text}</span>
              <button onClick={() => setNotice(null)} aria-label="Закрыть уведомление"><X size={17} /></button>
            </div>
          )}

          <div className="work-grid">
            <MoleculeForm onSubmit={handlePredict} loading={loading} />
            <section className="panel workflow-panel">
              <div className="section-title-row">
                <div className="section-icon purple"><GitCompareArrows size={19} /></div>
                <div><h2>Быстрые действия</h2><p>Пакетные вычисления и рабочие инструменты</p></div>
              </div>
              <div className="batch-illustration"><div className="batch-icon"><Layers3 size={32} /></div>
                <div><strong>Готовый набор из {samples.length} молекул</strong><span>Этанол, бензен, ацетон и другие образцы</span></div></div>
              <button className="secondary-button full-button" disabled={loading || samples.length === 0} onClick={() => void handleBatch()}>
                {loading ? <LoaderCircle className="spin" size={17} /> : <Play size={17} />} Анализировать все образцы
              </button>
              <div className="workflow-footnote"><CircleHelp size={16} /> Первый запуск загружает модель. Результаты сохраняются автоматически.</div>
              <button className="text-button refresh-button" disabled={loading} onClick={() => void refresh().catch((error: Error) => setNotice({kind:'error',text:error.message}))}>
                <RefreshCw size={15} /> Обновить данные
              </button>
            </section>
          </div>

          <MoleculeTable rows={visible} allCount={results.length} query={query} onQuery={setQuery}
            sortMode={sortMode} onSortMode={setSortMode} selected={selected}
            onToggle={toggleSelection} onDelete={(smiles) => void handleDelete(smiles)} disabled={loading} />

          <section className="panel comparison-panel" id="comparison">
            <div className="panel-topline">
              <div><div className="eyebrow">ВИЗУАЛИЗАЦИЯ ДАННЫХ</div>
                <h2>Сравнение растворимости</h2>
                <p>{compared.length > 0 ? `Выбрано соединений: ${compared.length}.` : 'Выберите вещества в таблице или просмотрите первые 10 результатов.'}</p>
              </div>
              <span className="chart-tag"><BarChart3 size={16} /> logS · моль/л</span>
            </div>
            {chartMolecules.length > 0 ? <ComparisonChart molecules={chartMolecules} experiments={experiments} /> : (
              <div className="chart-placeholder"><BarChart3 size={38} /><strong>График пока пуст</strong><span>Запустите анализ молекул, чтобы увидеть результаты.</span></div>
            )}
            {compared.length > 0 && <button className="text-button" onClick={() => setSelected(new Set())}><X size={14} /> Сбросить выбор</button>}
          </section>

          <section className="panel experiment-panel">
            <div className="panel-topline">
              <div><div className="eyebrow">ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА</div>
                <h2>Экспериментальные значения</h2>
                <p>Добавьте измеренное logS и источник публикации для сопоставления с прогнозом.</p></div>
              <span className="reference-count">Источников: {experiments.length}</span>
            </div>
            <form className="experimental-form" onSubmit={(event) => void handleExperimental(event)}>
              <label>Молекула
                <select value={experimentalSmiles} onChange={(event) => setExperimentalSmiles(event.target.value)} required disabled={loading}>
                  <option value="">Выберите...</option>
                  {results.map((item) => <option value={item.smiles} key={item.smiles}>{item.molecule_name}</option>)}
                </select>
              </label>
              <label>Экспериментальный logS
                <input type="number" step="any" value={experimentalValue} onChange={(event) => setExperimentalValue(event.target.value)}
                  placeholder="Например, −2.15" required disabled={loading} />
              </label>
              <label>Источник данных
                <input type="text" value={experimentalSource} onChange={(event) => setExperimentalSource(event.target.value)}
                  maxLength={500} placeholder="DOI, URL или название статьи" required disabled={loading} />
              </label>
              <button type="submit" className="outline-button" disabled={loading || results.length === 0}><Plus size={17} /> Добавить</button>
            </form>
            {experiments.length > 0 && <div className="reference-list">
              {experiments.map((exp) => {
                const molecule = results.find((item) => item.smiles === exp.smiles);
                if (!molecule) return null;
                return <div key={exp.smiles} className="reference-row">
                  <span>{molecule.molecule_name}</span><span>Прогноз: {molecule.predicted_value.toFixed(4)}</span>
                  <span>Эксперимент: {exp.experimental_value.toFixed(4)}</span>
                  <strong>Δ = {Math.abs(molecule.predicted_value - exp.experimental_value).toFixed(4)}</strong>
                  <small title={exp.source}>{exp.source}</small>
                </div>;
              })}
            </div>}
            <div className="experimental-note"><CircleHelp size={15} /> Вводите значения именно в log₁₀(моль/л). Для полностью смешивающихся жидкостей сопоставление с logS может быть неоднозначным.</div>
          </section>

          <footer className="footer-bar">
            <span><Atom size={16} /> AI Chemistry Lab · {new Date().getFullYear()}</span>
            <div><span><Server size={14} /> Python + FastAPI</span><span><Github size={14} /> React + TypeScript</span><a href={`${API_URL}/docs`} target="_blank" rel="noreferrer">API Docs <ArrowRight size={13} /></a></div>
          </footer>
        </div>
      </main>
    </div>
  );
}
