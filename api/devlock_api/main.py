from devlock_api.routes import v1
from fastapi import FastAPI
from prometheus_fastapi_instrumentator import Instrumentator
from starlette.middleware.gzip import GZipMiddleware
from starlette.responses import RedirectResponse

app = FastAPI()
app.add_middleware(GZipMiddleware, minimum_size=1000, compresslevel=5)

Instrumentator().instrument(app).expose(app, include_in_schema=False)

app.include_router(v1.router)


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")


@app.get("/health", include_in_schema=False)
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8080)
