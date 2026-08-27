# IndicTrans2 Translation Microservice

A minimal FastAPI wrapper around the [IndicTrans2](https://github.com/AI4Bharat/IndicTrans2) model that exposes a REST endpoint for the BusManagement API to call.

## Setup

```bash
# 1. Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/macOS

# 2. Install IndicTransToolkit
git clone https://github.com/VarunGumma/IndicTransToolkit.git
pip install --editable ./IndicTransToolkit

# 3. Install service dependencies
pip install -r requirements.txt
```

## Run

```bash
uvicorn main:app --host 0.0.0.0 --port 5100
```

The model (~3 GB) is downloaded from HuggingFace on first run and cached locally.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/translate` | Translate a batch of texts |
| GET | `/health` | Health check + device info |

### POST /translate

```json
{
  "texts": ["KOYAMBEDU BUS STAND", "ANNA NAGAR"],
  "target_language": "ta"
}
```

Response:
```json
{
  "translations": ["கோயம்பேடு பேருந்து நிலையம்", "அண்ணா நகர்"]
}
```

## Supported target languages

| Code | Language |
|------|----------|
| `ta` | Tamil |
| `hi` | Hindi |
| `te` | Telugu |
| `kn` | Kannada |
| `ml` | Malayalam |
| `mr` | Marathi |
| `bn` | Bengali |
| `gu` | Gujarati |
| `pa` | Punjabi |
| `or` | Odia |
