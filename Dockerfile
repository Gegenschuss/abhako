FROM python:3.12-slim
RUN pip install --no-cache-dir flask==3.0.3 waitress==3.0.0 python-dateutil==2.9.0 tzdata
WORKDIR /app
COPY app.py /app/app.py
COPY static /app/static
EXPOSE 3040
CMD ["python", "app.py"]
