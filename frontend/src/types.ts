export interface MoleculeInput {
  name: string;
  smiles: string;
}

export interface MoleculeResult {
  molecule_name: string;
  formula: string;
  smiles: string;
  predicted_property: string;
  predicted_value: number;
  model_name?: string;
}

export interface BatchResponse {
  success: MoleculeResult[];
  errors: { molecule_name: string; error: string }[];
}

export interface ExperimentalValue {
  smiles: string;
  experimental_value: number;
  source: string;
}
