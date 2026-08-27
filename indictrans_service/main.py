import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
from IndicTransToolkit import IndicProcessor

# en -> Indic direction model (covers Tamil: eng_Latn -> tam_Taml)
MODEL_NAME = "ai4bharat/indictrans2-en-indic-1B"

print(f"Loading model {MODEL_NAME}...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)
model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME, trust_remote_code=True)
ip = IndicProcessor(inference=True)

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
model = model.to(DEVICE)
model.eval()
print(f"Model loaded on {DEVICE}")

# Language code map: ISO 639-1 -> IndicTrans2 lang tag
LANG_MAP: dict[str, str] = {
    "ta": "tam_Taml",  # Tamil
    "hi": "hin_Deva",  # Hindi
    "te": "tel_Telu",  # Telugu
    "kn": "kan_Knda",  # Kannada
    "ml": "mal_Mlym",  # Malayalam
    "mr": "mar_Deva",  # Marathi
    "bn": "ben_Beng",  # Bengali
    "gu": "guj_Gujr",  # Gujarati
    "pa": "pan_Guru",  # Punjabi
    "or": "ory_Orya",  # Odia
}

SRC_LANG = "eng_Latn"

app = FastAPI(title="IndicTrans2 Translation Service")


class TranslateRequest(BaseModel):
    texts: list[str]
    target_language: str  # ISO 639-1 code, e.g. "ta"


class TranslateResponse(BaseModel):
    translations: list[str]


@app.post("/translate", response_model=TranslateResponse)
def translate(req: TranslateRequest):
    tgt_lang = LANG_MAP.get(req.target_language)
    if tgt_lang is None:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported target language '{req.target_language}'. Supported: {list(LANG_MAP.keys())}",
        )

    if not req.texts:
        return TranslateResponse(translations=[])

    batch = ip.preprocess_batch(req.texts, src_lang=SRC_LANG, tgt_lang=tgt_lang)

    inputs = tokenizer(
        batch,
        truncation=True,
        padding="longest",
        return_tensors="pt",
        return_attention_mask=True,
    ).to(DEVICE)

    with torch.no_grad():
        generated_tokens = model.generate(
            **inputs,
            use_cache=True,
            min_length=0,
            max_length=256,
            num_beams=5,
            num_return_sequences=1,
        )

    with tokenizer.as_target_tokenizer():
        decoded = tokenizer.batch_decode(
            generated_tokens.detach().cpu().tolist(),
            skip_special_tokens=True,
            clean_up_tokenization_spaces=True,
        )

    translations = ip.postprocess_batch(decoded, lang=tgt_lang)
    return TranslateResponse(translations=translations)


@app.get("/health")
def health():
    return {"status": "ok", "device": DEVICE, "model": MODEL_NAME}
