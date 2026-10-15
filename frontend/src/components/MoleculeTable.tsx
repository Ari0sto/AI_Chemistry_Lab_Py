import { ArrowDown, ArrowUp, ArrowUpDown, Download, Search, Trash2 } from 'lucide-react';
import type { MoleculeResult } from '../types';
import { API_URL } from '../api';

export type SortMode = 'newest' | 'asc' | 'desc';

interface MoleculeTableProps {
  rows: MoleculeResult[];
  allCount: number;
  query: string;
  onQuery: (value: string) => void;
  sortMode: SortMode;
  onSortMode: (value: SortMode) => void;
  selected: Set<string>;
  onToggle: (smiles: string) => void;
  onDelete: (smiles: string) => void;
  disabled: boolean;
}

export default function MoleculeTable(props: MoleculeTableProps) {
  const {
    rows, allCount, query, onQuery, sortMode, onSortMode,
    selected, onToggle, onDelete, disabled,
  } = props;

  return (
    <section className="panel results-panel" id="results">
      <div className="panel-topline">
        <div>
          <div className="eyebrow">МОЛЕКУЛЯРНАЯ БИБЛИОТЕКА</div>
          <h2>Результаты исследований <span className="count-pill">{allCount}</span></h2>
          <p>Прогнозируемая водная растворимость · logS (log₁₀ моль/л)</p>
        </div>
        <a className="outline-button download-button" href={`${API_URL}/export/results`}>
          <Download size={16} /> <span>Скачать CSV</span>
        </a>
      </div>
      <div className="table-controls">
        <label className="search-box">
          <Search size={17} />
          <input value={query} onChange={(e) => onQuery(e.target.value)}
            aria-label="Поиск по названию или SMILES" placeholder="Поиск по названию или SMILES..." />
        </label>
        <div className="select-wrap">
          <ArrowUpDown size={16} />
          <select aria-label="Сортировка" value={sortMode} onChange={(e) => onSortMode(e.target.value as SortMode)}>
            <option value="newest">По умолчанию</option>
            <option value="desc">logS: по убыванию</option>
            <option value="asc">logS: по возрастанию</option>
          </select>
        </div>
      </div>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th className="col-select">Сравнить</th>
              <th>Молекула</th>
              <th>Формула</th>
              <th>SMILES</th>
              <th className="num-cell">Прогноз logS</th>
              <th className="col-actions">Действия</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.smiles} className={selected.has(item.smiles) ? 'selected-row' : ''}>
                <td><input type="checkbox" className="row-checkbox" aria-label={`Сравнить ${item.molecule_name}`}
                  checked={selected.has(item.smiles)} onChange={() => onToggle(item.smiles)} /></td>
                <td><div className="molecule-name"><span className="molecule-orb" />{item.molecule_name}</div></td>
                <td><span className="formula-text">{item.formula}</span></td>
                <td><code className="smiles-code" title={item.smiles}>{item.smiles}</code></td>
                <td className="num-cell"><span className="value-pill">{item.predicted_value.toFixed(4)}</span></td>
                <td><button className="icon-button danger-hover" aria-label={`Удалить ${item.molecule_name}`}
                  disabled={disabled} onClick={() => onDelete(item.smiles)} title="Удалить запись"><Trash2 size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="table-empty">
            <span className="empty-orbit">⌬</span>
            <strong>{allCount === 0 ? 'Пока нет результатов' : 'Совпадений не найдено'}</strong>
            <p>{allCount === 0 ? 'Проанализируйте молекулу или загрузите тестовые образцы.' : 'Попробуйте другой поисковый запрос.'}</p>
          </div>
        )}
      </div>
      <div className="table-footer">
        <span>Показано {rows.length} из {allCount} соединений</span>
        <span className="sort-hint">{sortMode === 'asc' ? <ArrowUp size={14} /> : sortMode === 'desc' ? <ArrowDown size={14} /> : null} Данные сохраняются в CSV</span>
      </div>
    </section>
  );
}
