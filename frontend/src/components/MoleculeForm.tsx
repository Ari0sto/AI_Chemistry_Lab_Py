import { useState, type FormEvent } from 'react';
import { ArrowRight, Atom, FlaskConical } from 'lucide-react';
import type { MoleculeInput } from '../types';

interface MoleculeFormProps {
  onSubmit: (data: MoleculeInput) => Promise<void>;
  loading: boolean;
}

export default function MoleculeForm({ onSubmit, loading }: MoleculeFormProps) {
  const [name, setName] = useState('');
  const [smiles, setSmiles] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !smiles.trim()) return;
    try {
      await onSubmit({ name: name.trim(), smiles: smiles.trim() });
      setName('');
      setSmiles('');
    } catch {
      // Сообщение об ошибке отображается в родительском компоненте.
    }
  }

  return (
    <section className="panel form-panel" id="analyze">
      <div className="section-title-row">
        <div className="section-icon"><FlaskConical size={19} /></div>
        <div>
          <h2>Анализ молекулы</h2>
          <p>Введите название вещества и его SMILES-структуру</p>
        </div>
      </div>
      <form onSubmit={submit} className="molecule-form">
        <label htmlFor="molecule-name">Название соединения</label>
        <div className="field-wrap">
          <Atom size={17} />
          <input id="molecule-name" value={name} maxLength={100}
            onChange={(e) => setName(e.target.value)} placeholder="Например, Этанол"
            required disabled={loading} />
        </div>
        <label htmlFor="molecule-smiles">Структура SMILES</label>
        <div className="field-wrap mono-field">
          <span className="smiles-symbol">C</span>
          <input id="molecule-smiles" value={smiles} maxLength={1000}
            onChange={(e) => setSmiles(e.target.value)} placeholder="Например, CCO"
            required disabled={loading} />
        </div>
        <div className="form-hint">Формула рассчитывается автоматически с помощью RDKit.</div>
        <button type="submit" className="primary-button full-button" disabled={loading || !name.trim() || !smiles.trim()}>
          {loading ? 'Вычисление...' : 'Прогнозировать растворимость'}
          {!loading && <ArrowRight size={17} />}
        </button>
      </form>
    </section>
  );
}
