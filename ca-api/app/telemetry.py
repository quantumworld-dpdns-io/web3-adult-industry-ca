import logging
from typing import Optional

logger = logging.getLogger(__name__)


def setup_telemetry(app_name: str = "ca-api", otlp_endpoint: Optional[str] = None) -> None:
    try:
        from opentelemetry import trace
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

        resource = Resource.create(
            attributes={
                "service.name": app_name,
                "service.version": "0.1.0",
                "deployment.environment": "production",
            }
        )

        provider = TracerProvider(resource=resource)

        if otlp_endpoint:
            try:
                from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import (
                    OTLPSpanExporter,
                )

                otlp_exporter = OTLPSpanExporter(endpoint=otlp_endpoint, insecure=True)
                processor = BatchSpanProcessor(otlp_exporter)
                provider.add_span_processor(processor)
                logger.info("OTLP exporter configured at %s", otlp_endpoint)
            except Exception as exc:
                logger.warning("Failed to configure OTLP exporter: %s", exc)

        trace.set_tracer_provider(provider)

        from app.main import app as _fastapi_app

        FastAPIInstrumentor.instrument_app(_fastapi_app)
        logger.info("OpenTelemetry instrumentation setup complete for %s", app_name)
    except ImportError:
        logger.info("OpenTelemetry packages not installed; telemetry disabled")
    except Exception as exc:
        logger.warning("Failed to setup OpenTelemetry: %s", exc)
