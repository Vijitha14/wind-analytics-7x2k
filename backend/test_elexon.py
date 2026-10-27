
import httpx

BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1/forecast/generation/wind/history"

PUBLICATION_TIMES = [
    "2026-01-15T09:30:00Z",
    "2026-01-15T10:30:00Z",
    "2026-01-15T12:30:00Z",
]


def main():
    with httpx.Client(timeout=60) as client:
        for publish_time in PUBLICATION_TIMES:
            print(f"\n{'=' * 60}")
            print("Requested publication time:", publish_time)
            print("=" * 60)

            try:
                response = client.get(
                    BASE_URL,
                    params={"publishTime": publish_time},
                )

                print("HTTP status:", response.status_code)
                response.raise_for_status()

                result = response.json()

                if isinstance(result, dict):
                    records = result.get("data", [])
                else:
                    records = result

                print("Record count:", len(records))

                if records:
                    returned_times = sorted({
                        record.get("publishTime")
                        for record in records
                        if record.get("publishTime")
                    })

                    print("Returned publication times:", returned_times)
                    print("First record:", records[0])
                    print("Last record:", records[-1])

            except (httpx.HTTPError, ValueError) as error:
                print("ERROR:", repr(error))


if __name__ == "__main__":
    main()
