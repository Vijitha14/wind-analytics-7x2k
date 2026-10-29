\# Wind Generation Forecast vs Actual — January 2026



\## Overview



This project compares day-ahead wind generation forecasts with actual wind generation in Great Britain for January 2026. It uses data from the Elexon BMRS API and presents the results through a dashboard.



The dashboard shows forecast and actual generation, forecast error metrics, and the coverage of the available data. The purpose is to make it easier to see how closely the forecast matched the generation recorded for each hour.



\## Application



\- \*\*Frontend:\*\* https://wind-analytics-7x2k-1.onrender.com

\- \*\*Backend API:\*\* https://wind-analytics-7x2k.onrender.com

\- \*\*Health check:\*\* https://wind-analytics-7x2k.onrender.com/api/health

\- \*\*GitHub repository:\*\* https://github.com/Vijitha14/wind-analytics-7x2k



\## Technology used



\- \*\*React\*\* — dashboard interface and presentation of the results.

\- \*\*Vite\*\* — frontend development server and build tooling.

\- \*\*Python\*\* — data processing and backend logic.

\- \*\*FastAPI\*\* — API endpoints and delivery of analysis results to the frontend.

\- \*\*HTTPX\*\* — HTTP requests to the Elexon API.

\- \*\*Uvicorn\*\* — running the FastAPI application.

\- \*\*Docker\*\* — container configuration for the frontend and backend.

\- \*\*Elexon BMRS API\*\* — source of actual wind generation and wind generation forecast data.

\- \*\*Git and GitHub\*\* — version control and source code hosting.

\- \*\*Render\*\* — current hosting for the frontend and backend.



\## Data sources



The application uses the following Elexon BMRS API datasets.



\### Actual wind generation



The `FUELHH/stream` endpoint provides half-hourly generation records. The application filters the records to include wind generation (`fuelType = WIND`) for January 2026.



The two half-hourly readings within each hour are averaged to obtain hourly actual generation. Only hours with both half-hourly readings available are retained.



\### Wind generation forecasts



The application uses the wind generation forecast history endpoint:



`https://data.elexon.co.uk/bmrs/api/v1/forecast/generation/wind/history`



Forecast records are selected using their delivery time and publication time. For each delivery day, the application uses the latest eligible forecast published at or before the decision-time cutoff.



\## Forecast selection and methodology



The analysis covers delivery dates from 1 January through 31 January 2026.



The forecast decision-time cutoff is \*\*10:30 UTC on the day before delivery\*\*. This is the cutoff used by the application for selecting the forecast snapshot. For each delivery day, the latest available publication at or before that cutoff is selected.



The selected forecasts are matched with the corresponding hourly actual generation values. Only matched hours are included in the error calculations.



The cutoff represents the decision-time assumption used for this analysis. It should not be interpreted as a claim that every forecast was published exactly at 10:30 UTC.



\## Metrics



The dashboard reports the following metrics:



\- \*\*Mean Absolute Error (MAE):\*\* the average absolute difference between forecast and actual generation.

\- \*\*Mean Absolute Percentage Error (MAPE):\*\* the average absolute forecast error expressed as a percentage of actual generation.

\- \*\*Mean forecast bias:\*\* the average signed difference between forecast and actual generation. A positive value indicates that the forecast was higher than actual generation.

\- \*\*Matched intervals:\*\* the number of hourly forecast and actual pairs included in the analysis.

\- \*\*Coverage:\*\* the proportion of expected hourly intervals represented by matched data.



The current validated result contains 744 matched hourly intervals, representing 100% coverage for the 31-day period.



The metrics are calculated from the selected forecast snapshots and the matched hourly actual generation values.



\## Project structure



```text

gridbricks-challenge/

├── backend/

│   ├── main.py

│   └── requirements.txt

├── frontend/

│   ├── src/

│   │   └── App.jsx

│   ├── package.json

│   └── ...

├── Dockerfile

├── docker-compose.yml

└── README.md

```



The frontend and backend may contain additional configuration files. The structure above lists the main files used to run the application.



\## Running locally



\### Requirements



Install the following before starting:



\- Python 3.12 or a compatible version

\- Node.js and npm

\- Docker Desktop, if running the application with Docker



\### Start the backend



From the project root, create and activate a Python virtual environment if needed.



On Windows PowerShell:



```powershell

python -m venv .venv

.\\.venv\\Scripts\\Activate.ps1

pip install -r backend/requirements.txt

uvicorn backend.main:app --reload

```



The backend will be available at:



`http://127.0.0.1:8000`



Useful endpoints:



\- `http://127.0.0.1:8000/api/health`

\- `http://127.0.0.1:8000/api/wind-analysis`



\### Start the frontend



Open another terminal and move into the frontend directory:



```powershell

cd frontend

npm install

npm run dev

```



Open the local URL printed by Vite, normally:



`http://localhost:5173`



\### Run with Docker



From the project root, run:



```bash

docker compose up --build

```



Docker Compose builds and starts the services using the configuration included in the repository. Check the port mappings in the Docker configuration if the local URLs differ.



\## API endpoints



| Endpoint | Purpose |

|---|---|

| `/` | Backend root endpoint |

| `/api/health` | Checks whether the API is responding |

| `/api/wind-analysis` | Returns the wind generation analysis and metrics |



\## Limitations



\- The results depend on the data available through the Elexon BMRS API.

\- Forecast accuracy is evaluated only for matched hourly intervals.

\- Half-hourly actual generation is converted to hourly generation using the arithmetic mean of the two readings.

\- The 10:30 UTC cutoff is an analysis assumption used to select eligible forecast publications.

\- The results describe January 2026 and should not automatically be generalized to other months.



\## AI tools and development assistance



AI tools were used as development assistance during this project, including help with implementation, debugging, reviewing the API integration, and preparing project documentation.



The application code, configuration, and results should be reviewed and tested against the assignment requirements before submission. The project is intended to be explainable and maintainable, and the implementation and methodology should be understood by the person submitting it.



\## Status



The application is deployed on Render, and the January 2026 analysis has been checked for 744 matched hourly intervals and 100% coverage.



The deployment and submission checklist should be completed before final submission, including confirming the required hosting platform, testing the public URLs, and recording the requested demonstration video.



