.PHONY: install run clean format

install:
	pip install -r requirements.txt

run:
	uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete

format:
	black app/
	isort app/
