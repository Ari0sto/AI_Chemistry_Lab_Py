"""Локальное прогнозирование водной растворимости через Hugging Face."""
from threading import Lock
import math

import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

from chemistry import analyze_smiles

MODEL_NAME = "khanfs/ChemSolubilityBERTa"
_tokenizer = None
_model = None
_load_lock = Lock()


def load_model() -> None:
    """Загружаем веса однократно. HF_HOME определяет папку кэша."""
    global _tokenizer, _model

    if _tokenizer is not None and _model is not None:
        return

    with _load_lock:
        if _tokenizer is not None and _model is not None:
            return

        print(f"Загрузка модели: {MODEL_NAME}", flush=True)
        try:
            tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
            model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
            model.eval()
        except Exception as error:
            raise RuntimeError(f"Не удалось загрузить модель: {error}") from error

        _tokenizer = tokenizer
        _model = model
        print("Модель успешно загружена.", flush=True)


def predict_solubility(smiles: str) -> float:
    """Возвращает log10 растворимости (моль/л), без молярной конвертации."""
    canonical_smiles = analyze_smiles(smiles)["smiles"]
    load_model()

    try:
        # Не допускаем незаметной обрезки молекулы токенизатором.
        inputs = _tokenizer(canonical_smiles, return_tensors="pt", truncation=False)
        token_count = inputs["input_ids"].shape[1]
        limit = min(512, int(_model.config.max_position_embeddings) - 2)
        if token_count > limit:
            raise ValueError(
                f"SMILES содержит {token_count} токенов. Максимум для модели: {limit}."
            )

        with torch.inference_mode():
            outputs = _model(**inputs)

        value = float(outputs.logits.squeeze().item())
        if not math.isfinite(value):
            raise RuntimeError("Модель вернула нечисловой результат.")
        return round(value, 4)

    except ValueError:
        raise
    except Exception as error:
        raise RuntimeError(f"Ошибка прогнозирования: {error}") from error


if __name__ == "__main__":
    load_model()
    for name, smiles in [
        ("Этанол", "CCO"), ("Уксусная кислота", "CC(=O)O"), ("Бензен", "c1ccccc1")
    ]:
        print(f"{name}: logS = {predict_solubility(smiles)}")
