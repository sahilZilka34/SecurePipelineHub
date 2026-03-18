FROM python:3.10-slim

WORKDIR /app

COPY src_requirements.txt .
RUN pip install --no-cache-dir -r src_requirements.txt

COPY app.py .

EXPOSE 5000

CMD ["python", "app.py"]