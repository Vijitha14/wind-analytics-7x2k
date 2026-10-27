
from datetime import date, datetime, timedelta, timezone

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Gridbricks Energy Analytics API",
    description="January 2026 wind generation forecast analysis",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)

BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1"
UTC = timezone.utc


@app.get("/")
def health_check():
    return {"status": "ok", "message": "Gridbricks backend is running"}


@app.get("/api/health")
def api_health():
    return {"status": "healthy", "service": "energy-analytics"}


def parse_time(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def get_json(client, url, params):
    response = client.get(url, params=params)
    response.raise_for_status()
    return response.json()


@app.get("/api/wind-analysis")
def wind_analysis():
    try:
        with httpx.Client(timeout=60) as client:
            raw_actuals = get_json(
                client,
                f"{BASE_URL}/datasets/FUELHH/stream",
                {
                    "settlementDateFrom": "2026-01-01",
                    "settlementDateTo": "2026-02-01",
                },
            )

            # Keep only January WIND actuals.
            half_hourly = {
                record["startTime"]: float(record["generation"])
                for record in raw_actuals
                if record.get("fuelType") == "WIND"
                and record.get("settlementDate", "").startswith("2026-01")
                and record.get("startTime")
                and record.get("generation") is not None
            }

            # Convert actuals to hourly averages because the inspected
            # forecast endpoint returns hourly target timestamps.
            hourly_actuals = {}

            for timestamp, generation in half_hourly.items():
                interval = parse_time(timestamp)
                hour_start = interval.replace(minute=0, second=0, microsecond=0)
                hourly_actuals.setdefault(hour_start, []).append(generation)

            actuals = {
                hour: sum(values) / len(values)
                for hour, values in hourly_actuals.items()
                if len(values) == 2
            }

            if not actuals:
                raise HTTPException(
                    status_code=502,
                    detail="No complete hourly actual intervals were found.",
                )

            forecast_by_delivery = {}

            # One forecast snapshot per delivery day.
            delivery_dates = sorted({hour.date() for hour in actuals})

            for delivery_date in delivery_dates:
                decision_date = delivery_date - timedelta(days=1)
                decision_time = datetime.combine(
                    decision_date,
                    datetime.min.time(),
                    tzinfo=UTC,
                ) + timedelta(hours=9, minutes=30)

                records = get_json(
                    client,
                    f"{BASE_URL}/forecast/generation/wind/history",
                    {
                        "publishTime": decision_time.isoformat()
                        .replace("+00:00", "Z")
                    },
                )

                if isinstance(records, dict):
                    records = records.get("data", [])

                for record in records:
                    if not record.get("startTime") or record.get("generation") is None:
                        continue

                    delivery_time = parse_time(record["startTime"])
                    publication_time = parse_time(record["publishTime"])

                    # Never accept forecasts published after the cutoff.
                    if publication_time > decision_time:
                        continue

                    # Only match the delivery day for this snapshot.
                    if delivery_time.date() != delivery_date:
                        continue

                    if delivery_time not in actuals:
                        continue

                    current = forecast_by_delivery.get(delivery_time)

                    if current is None or publication_time > current["published"]:
                        forecast_by_delivery[delivery_time] = {
                            "published": publication_time,
                            "generation": float(record["generation"]),
                        }

            rows = []

            for delivery_time in sorted(actuals):
                forecast = forecast_by_delivery.get(delivery_time)

                if forecast is None:
                    continue

                actual = actuals[delivery_time]
                predicted = forecast["generation"]

                rows.append({
                    "startTime": delivery_time.isoformat().replace("+00:00", "Z"),
                    "actual": round(actual, 2),
                    "forecast": round(predicted, 2),
                    "error": round(predicted - actual, 2),
                    "absoluteError": round(abs(predicted - actual), 2),
                    "forecastPublishTime": forecast["published"]
                    .isoformat()
                    .replace("+00:00", "Z"),
                })

            if not rows:
                raise HTTPException(
                    status_code=502,
                    detail=(
                        "No forecast intervals matched. Check the API response "
                        "and decision-time assumption."
                    ),
                )

            absolute_errors = [row["absoluteError"] for row in rows]
            mae = sum(absolute_errors) / len(absolute_errors)

            nonzero_actuals = [row for row in rows if row["actual"] != 0]
            mape = (
                sum(
                    abs(row["forecast"] - row["actual"])
                    / abs(row["actual"]) * 100
                    for row in nonzero_actuals
                ) / len(nonzero_actuals)
                if nonzero_actuals
                else None
            )

            return {
                "period": {
                    "from": "2026-01-01",
                    "to": "2026-01-31",
                    "timezone": "UTC",
                },
                "methodology": {
                    "decisionTime": "09:30 UTC on the day before delivery",
                    "actualAggregation": (
                        "Arithmetic mean of each pair of half-hourly actuals "
                        "to align with hourly forecast timestamps."
                    ),
                    "note": (
                        "Provisional assumption. Confirm the cutoff and "
                        "generation units before final submission."
                    ),
                },
                "metrics": {
                    "actualIntervals": len(actuals),
                    "matchedIntervals": len(rows),
                    "coveragePercent": round(
                        len(rows) / len(actuals) * 100, 2
                    ),
                    "mae": round(mae, 2),
                    "mapePercent": round(mape, 2) if mape is not None else None,
                },
                "data": rows,
                "source": "Elexon BMRS",
            }

    except HTTPException:
        raise
    except (httpx.HTTPError, ValueError, KeyError, TypeError) as error:
        raise HTTPException(
            status_code=502,
            detail=f"Could not retrieve or process Elexon data: {error}",
        ) from error
