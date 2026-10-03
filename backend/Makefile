VENV ?= simplyodd
PYTHON := $(VENV)/bin/python
PORT ?= 8000

.PHONY: help install run-dev run-demo run test seed

help:
	@echo "make install   Create the virtualenv ($(VENV)) and install dependencies"
	@echo "make run-dev   Run the API with auto-reload on http://localhost:$(PORT)"
	@echo "make run-demo  Run the API on local demo data (in-memory, /seed images, dev sign-in), no Firebase needed"
	@echo "make run       Run the API without reload"
	@echo "make test      Run the test suite"
	@echo "make seed      Seed the configured data backend"

$(PYTHON):
	python3 -m venv $(VENV)

install: $(PYTHON)
	$(PYTHON) -m pip install -r requirements-dev.txt

.env:
	cp .env.example .env

run-dev: $(PYTHON) .env
	$(PYTHON) -m uvicorn app.main:app --reload --reload-dir app --port $(PORT)

# Local demo: the in-memory store seeded with the demo catalogue, whose images live in frontend/public/seed
# (generate them with `$(PYTHON) scripts/generate_art.py`). Overrides .env, so Firestore is never touched.
run-demo: $(PYTHON) .env
	DATA_BACKEND=memory MEDIA_BACKEND=local ALLOW_DEV_AUTH=true MEMORY_PERSIST_PATH=.data/demo-store.json GOOGLE_APPLICATION_CREDENTIALS= \
		$(PYTHON) -m uvicorn app.main:app --reload --reload-dir app --port $(PORT)

run: $(PYTHON) .env
	$(PYTHON) -m uvicorn app.main:app --host 0.0.0.0 --port $(PORT)

test: $(PYTHON)
	$(PYTHON) -m pytest

seed: $(PYTHON) .env
	$(PYTHON) -m scripts.seed
