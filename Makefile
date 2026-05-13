.PHONY: install run clean format

install:
	pip install -r requirements.txt

run:
	fastapi dev app/main.py

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete

format:
	black app/
	isort app/
