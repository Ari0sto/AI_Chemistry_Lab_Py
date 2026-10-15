"""HTTP API для React-интерфейса AI Chemistry Lab."""
import csv
import math
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from chemistry import analyze_smiles
from hf_model import MODEL_NAME, predict_solubility
from storage import (
    RESULTS_FILE, delete_result, ensure_data_files, load_experimental,
    load_results, load_samples, save_experimental, save_result,
    search_results, sort_results,
)

app = FastAPI(title="AI Chemistry Lab API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type"],
)


class MoleculeRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    smiles: str = Field(min_length=1, max_length=1000)


class BatchRequest(BaseModel):
    molecules: list[MoleculeRequest] = Field(min_length=1, max_length=30)


class ExperimentalRequest(BaseModel):
    experimental_value: float
    source: str = Field(min_length=1, max_length=500)


def _read_or_500(operation):
    try:
        return operation()
    except (OSError, ValueError, csv.Error) as error:
        print("Ошибка чтения данных:", error)
        raise HTTPException(status_code=500, detail="Не удалось прочитать данные CSV.") from error


def _predict_and_save(data: MoleculeRequest) -> dict:
    name = data.name.strip()
    if not name:
        raise ValueError("Название вещества не может быть пустым.")

    molecule = analyze_smiles(data.smiles)
    prediction = predict_solubility(molecule["smiles"])
    result = {
        "molecule_name": name,
        "formula": molecule["formula"],
        "smiles": molecule["smiles"],
        "predicted_property": "logS",
        "predicted_value": prediction,
    }
    save_result(result)
    return {**result, "model_name": MODEL_NAME}


@app.get("/")
def home():
    return {"message": "AI Chemistry Lab API is running", "model": MODEL_NAME}


@app.post("/predict")
def predict_molecule(data: MoleculeRequest):
    try:
        return _predict_and_save(data)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except RuntimeError as error:
        print("Ошибка модели:", error)
        raise HTTPException(status_code=503, detail="Модель прогнозирования недоступна.") from error
    except (OSError, csv.Error) as error:
        print("Ошибка CSV:", error)
        raise HTTPException(status_code=500, detail="Не удалось сохранить результат.") from error


@app.post("/predict/batch")
def predict_batch(data: BatchRequest):
    success = []
    errors = []
    for item in data.molecules:
        try:
            success.append(_predict_and_save(item))
        except (ValueError, RuntimeError, OSError, csv.Error) as error:
            print(f"Ошибка анализа {item.name}: {error}")
            errors.append({"molecule_name": item.name, "error": str(error)})
    return {"success": success, "errors": errors}


@app.get("/molecules")
def get_molecules():
    return _read_or_500(load_results)


@app.get("/molecules/search")
def search_molecules(name: str = ""):
    return _read_or_500(lambda: search_results(name))


@app.get("/molecules/sort")
def sort_molecules(descending: bool = False):
    return _read_or_500(lambda: sort_results(descending))


@app.delete("/molecules/{smiles:path}")
def delete_molecule(smiles: str):
    try:
        canonical = analyze_smiles(smiles)["smiles"]
        if not delete_result(canonical):
            raise HTTPException(status_code=404, detail="Вещество не найдено.")
        return {"deleted": canonical}
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except (OSError, csv.Error) as error:
        raise HTTPException(status_code=500, detail="Не удалось удалить запись.") from error


@app.get("/samples")
def get_samples():
    return _read_or_500(load_samples)


@app.get("/experimental")
def get_experimental():
    return _read_or_500(load_experimental)


@app.put("/experimental/{smiles:path}")
def put_experimental(smiles: str, data: ExperimentalRequest):
    if not math.isfinite(data.experimental_value):
        raise HTTPException(status_code=400, detail="Значение должно быть конечным числом.")
    try:
        canonical = analyze_smiles(smiles)["smiles"]
        source = data.source.strip()
        if not source:
            raise ValueError("Укажи источник экспериментального значения.")
        save_experimental(canonical, data.experimental_value, source)
        return {"smiles": canonical, "experimental_value": data.experimental_value, "source": source}
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except (OSError, csv.Error) as error:
        raise HTTPException(status_code=500, detail="Не удалось сохранить экспериментальные данные.") from error


@app.get("/export/results")
def export_results():
    _read_or_500(load_results)  # Проверка целостности до выдачи
    ensure_data_files()
    return FileResponse(
        RESULTS_FILE,
        filename="chemistry_results.csv",
        media_type="text/csv; charset=utf-8",
    )


ensure_data_files()
