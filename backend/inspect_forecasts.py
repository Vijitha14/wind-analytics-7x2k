
import httpx

BASE_URL = (
    "https://data.elexon.co.uk/bmrs/api/v1/"
    "forecast/generation/wind/history"
)

PUBLICATION_TIMES = [
    "2026-01-01T00:00:00Z",
    "2026-01-01T09:30:00Z",
    "2026-01-02T09:30:00Z",
]


def main():
    with httpx.Client(timeout=60) as client:
        for publish_time in PUBLICATION_TIMES:
            print(f"\n{'=' * 60}")
            print("Requested publication:", publish_time)
            print("=" * 60)

            try:
                response = client.get(
                    BASE_URL,
                    params={"publishTime": publish_time},
                )

                print("HTTP status:", response.status_code)
                response.raise_for_status()

                result = response.json()

                # Handle either a list or a dictionary response.
                if isinstance(result, list):
                    records = result
                elif isinstance(result, dict):
                    records = result.get("data", [])

                    if not isinstance(records, list):
                        print("Unexpected data format:", type(records).__name__)
                        print("Response:", str(result)[:1000])
                        continue
                else:
                    print("Unexpected response:", str(result)[:1000])
                    continue

                print("Record count:", len(records))

                if not records:
                    print("No records returned.")
                    continue

                publication_times = sorted({
                    record.get("publishTime")
                    for record in records
                    if record.get("publishTime")
                })

                print("Actual publication times:", publication_times)

                print("\nFirst eight records:")
                for record in records[:8]:
                    print(
                        "Published:", record.get("publishTime"),
                        "| Delivery:", record.get("startTime"),
                        "| Settlement period:", record.get("settlementPeriod"),
                        "| Forecast:", record.get("generation"),
                    )

            except (httpx.HTTPError, ValueError) as error:
                print("Request failed:", repr(error))


if __name__ == "__main__":
    main()
