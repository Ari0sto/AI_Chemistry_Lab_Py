import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ExperimentalValue, MoleculeResult } from '../types';

interface ChartProps {
  molecules: MoleculeResult[];
  experiments: ExperimentalValue[];
}

export default function ComparisonChart({ molecules, experiments }: ChartProps) {
  const data = molecules.map((molecule) => {
    const measured = experiments.find((entry) => entry.smiles === molecule.smiles);
    return {
      name: molecule.molecule_name.length > 15 ? `${molecule.molecule_name.slice(0, 14)}…` : molecule.molecule_name,
      predicted: molecule.predicted_value,
      experimental: measured?.experimental_value,
    };
  });
  const hasExperimental = data.some((entry) => entry.experimental !== undefined);

  return (
    <div className="chart-content" role="img" aria-label="Сравнение прогнозируемой растворимости выбранных молекул">
      <ResponsiveContainer width="100%" height={285}>
        <BarChart data={data} margin={{ top: 12, right: 12, bottom: 8, left: -17 }} barGap={4}>
          <CartesianGrid vertical={false} stroke="#263247" strokeDasharray="3 5" />
          <XAxis dataKey="name" stroke="#8797af" tick={{ fill: '#a8b9ce', fontSize: 11 }}
            axisLine={false} tickLine={false} interval={0} />
          <YAxis stroke="#8797af" tick={{ fill: '#a8b9ce', fontSize: 11 }}
            axisLine={false} tickLine={false} tickFormatter={(n: number) => String(n)} />
          <Tooltip contentStyle={{ background: '#162338', border: '1px solid #39475b', borderRadius: 12, color: '#f1f5f9' }}
            formatter={(value) => Number(value).toFixed(4)} />
          {hasExperimental && <Legend wrapperStyle={{ color: '#afbdd0', fontSize: 12 }} />}
          <Bar dataKey="predicted" name="Прогноз logS" fill="#61d5c7" radius={[5, 5, 0, 0]} maxBarSize={58} />
          {hasExperimental && <Bar dataKey="experimental" name="Эксперимент logS" fill="#8b93f6" radius={[5, 5, 0, 0]} maxBarSize={58} />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
