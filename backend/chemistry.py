"""Проверка химических структур и получение формулы молекулы."""
from rdkit import Chem
from rdkit.Chem import rdMolDescriptors

MAX_SMILES_LENGTH = 1000


def analyze_smiles(smiles: str) -> dict:
    if not isinstance(smiles, str) or not smiles.strip():
        raise ValueError("SMILES не может быть пустым.")

    smiles = smiles.strip()
    if len(smiles) > MAX_SMILES_LENGTH:
        raise ValueError(f"SMILES слишком длинный (максимум {MAX_SMILES_LENGTH} символов).")

    molecule = Chem.MolFromSmiles(smiles)
    if molecule is None or molecule.GetNumAtoms() == 0:
        raise ValueError("Некорректное SMILES-представление.")

    return {
        "formula": rdMolDescriptors.CalcMolFormula(molecule),
        "smiles": Chem.MolToSmiles(molecule),
    }


if __name__ == "__main__":
    for name, smiles in [
        ("Этанол", "CCO"),
        ("Уксусная кислота", "CC(=O)O"),
        ("Бензен", "C1=CC=CC=C1"),
        ("Неверный SMILES", "ABC123"),
    ]:
        try:
            print(name, analyze_smiles(smiles))
        except ValueError as error:
            print(name, "Ошибка:", error)
