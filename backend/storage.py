"""Сохранение предсказаний и экспериментальных значений в CSV."""
import csv
import os
import tempfile
from pathlib import Path
from threading import RLock

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
RESULTS_FILE = DATA_DIR / "chemistry_results.csv"
SAMPLES_FILE = DATA_DIR / "molecules.csv"
EXPERIMENTAL_FILE = DATA_DIR / "experimental_values.csv"

RESULT_FIELDS = ["molecule_name", "formula", "smiles", "predicted_property", "predicted_value"]
SAMPLE_FIELDS = ["molecule_name", "smiles"]
EXPERIMENTAL_FIELDS = ["smiles", "experimental_value", "source"]
_file_lock = RLock()


def _read_csv(path: Path, expected_fields: list[str]) -> list[dict]:
    if not path.exists() or path.stat().st_size == 0:
        return []

    with path.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        if not reader.fieldnames or any(field not in reader.fieldnames for field in expected_fields):
            raise ValueError(f"Неверные колонки CSV: {path.name}")
        return list(reader)


def _write_csv(path: Path, fields: list[str], rows: list[dict]) -> None:
    """Атомарная запись: сперва временный файл, потом замена."""
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", encoding="utf-8-sig", newline="", delete=False,
            dir=path.parent, suffix=".tmp"
        ) as file:
            temp_path = Path(file.name)
            writer = csv.DictWriter(file, fieldnames=fields, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(rows)
        os.replace(temp_path, path)
    finally:
        if temp_path is not None and temp_path.exists():
            temp_path.unlink()


def load_results() -> list[dict]:
    with _file_lock:
        rows = _read_csv(RESULTS_FILE, RESULT_FIELDS)
        for row in rows:
            row["predicted_value"] = float(row["predicted_value"])
        return rows


def save_result(result: dict) -> None:
    with _file_lock:
        results = load_results()
        record = {key: result[key] for key in RESULT_FIELDS}
        for index, item in enumerate(results):
            if item["smiles"] == record["smiles"]:
                results[index] = record
                break
        else:
            results.append(record)
        _write_csv(RESULTS_FILE, RESULT_FIELDS, results)


def delete_result(smiles: str) -> bool:
    with _file_lock:
        results = load_results()
        remaining = [row for row in results if row["smiles"] != smiles]
        if len(remaining) == len(results):
            return False
        _write_csv(RESULTS_FILE, RESULT_FIELDS, remaining)
        return True


def search_results(name: str) -> list[dict]:
    needle = name.strip().casefold()
    return [row for row in load_results() if needle in row["molecule_name"].casefold()]


def sort_results(descending: bool = False) -> list[dict]:
    return sorted(load_results(), key=lambda row: row["predicted_value"], reverse=descending)


def load_samples() -> list[dict]:
    return _read_csv(SAMPLES_FILE, SAMPLE_FIELDS)


def load_experimental() -> list[dict]:
    with _file_lock:
        rows = _read_csv(EXPERIMENTAL_FILE, EXPERIMENTAL_FIELDS)
        for row in rows:
            row["experimental_value"] = float(row["experimental_value"])
        return rows


def save_experimental(smiles: str, value: float, source: str) -> None:
    with _file_lock:
        rows = load_experimental()
        record = {"smiles": smiles, "experimental_value": value, "source": source}
        for i, row in enumerate(rows):
            if row["smiles"] == smiles:
                rows[i] = record
                break
        else:
            rows.append(record)
        _write_csv(EXPERIMENTAL_FILE, EXPERIMENTAL_FIELDS, rows)


def ensure_data_files() -> None:
    with _file_lock:
        if not RESULTS_FILE.exists():
            _write_csv(RESULTS_FILE, RESULT_FIELDS, [])
        if not EXPERIMENTAL_FILE.exists():
            _write_csv(EXPERIMENTAL_FILE, EXPERIMENTAL_FIELDS, [])


if __name__ == "__main__":
    ensure_data_files()
    print("Примеров:", len(load_samples()))
    print("Результатов:", len(load_results()))
    print("Отсортированные результаты:", sort_results(descending=True))
