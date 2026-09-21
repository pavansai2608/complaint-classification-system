FROM python:3.11-slim AS deps
WORKDIR /build
COPY requirements.txt .
# torch's default PyPI wheel pulls in several GB of NVIDIA CUDA libraries
# for GPU support this service never uses (no GPU here or in Minikube), so
# torch is installed first from the CPU-only index, then the rest of the
# requirements normally - pip sees torch is already satisfied and skips it.
RUN grep -v '^torch' requirements.txt > requirements-notorch.txt && \
    pip install --no-cache-dir --user torch==2.14.0 --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir --user -r requirements-notorch.txt

FROM python:3.11-slim
WORKDIR /app
RUN useradd --create-home --shell /usr/sbin/nologin appuser
COPY --from=deps --chown=appuser:appuser /root/.local /home/appuser/.local
COPY --chown=appuser:appuser src/main/python ./src/main/python
COPY --chown=appuser:appuser models ./models

ENV PATH=/home/appuser/.local/bin:$PATH \
    PYTHONPATH=/app/src/main/python

USER appuser
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
