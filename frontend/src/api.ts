import type { BatchResponse, ExperimentalValue, MoleculeInput, MoleculeResult } from './types';

export const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    });
  } catch {
    throw new Error('Сервер недоступен. Убедитесь, что FastAPI запущен на порту 8000.');
  }

  if (!response.ok) {
    let detail = `Ошибка HTTP ${response.status}`;
    try {
      const body: { detail?: string | { msg: string }[] } = await response.json();
      if (typeof body.detail === 'string') detail = body.detail;
      else if (Array.isArray(body.detail)) detail = body.detail.map((x) => x.msg).join('; ');
    } catch { /* При не-JSON ответе выводим HTTP-статус */ }
    throw new Error(detail);
  }
  return (await response.json()) as T;
}

export const chemistryApi = {
  getResults: () => request<MoleculeResult[]>('/molecules'),
  getSamples: async (): Promise<MoleculeInput[]> => {
  const rows = await request<
    { molecule_name: string; smiles: string }[]
  >('/samples');

  return rows.map((row) => ({
    name: row.molecule_name,
    smiles: row.smiles,
  }));
},
  getExperiments: () => request<ExperimentalValue[]>('/experimental'),
  predict: (molecule: MoleculeInput) => request<MoleculeResult>('/predict', {
    method: 'POST', body: JSON.stringify(molecule),
  }),
  batchPredict: (molecules: MoleculeInput[]) => request<BatchResponse>('/predict/batch', {
    method: 'POST', body: JSON.stringify({ molecules }),
  }),
  delete: (smiles: string) => request<{ deleted: string }>(`/molecules/${encodeURIComponent(smiles)}`, {
    method: 'DELETE',
  }),
  saveExperimental: (smiles: string, experimental_value: number, source: string) =>
    request<ExperimentalValue>(`/experimental/${encodeURIComponent(smiles)}`, {
      method: 'PUT', body: JSON.stringify({ experimental_value, source }),
    }),
};
