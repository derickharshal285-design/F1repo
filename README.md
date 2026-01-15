# F1 Engineer Dashboard

A broadcast-quality telemetry dashboard for F1 data visualization.

## 🚀 How to Execute (Run the App)

This is a full-stack application. You need to run two separate processes:

### 1. The Backend (Python)
This fetches **Real F1 Data** (Track shapes, Driver lists) from the internet using the `FastF1` library.

1.  Open a terminal in this folder.
2.  Install the required libraries:
    ```bash
    pip install -r requirements.txt
    ```
    *(Note: installing pandas/fastf1 might take a minute)*
3.  Start the server:
    ```bash
    python server.py
    ```
    **Keep this window open.** It acts as the brain of the operation.

### 2. The Frontend (React)
This is the visual dashboard.

1.  Open this folder in VS Code.
2.  **Right-click `index.html`** and select **"Open with Live Server"**.
3.  The browser will open.
4.  Select a Year and Track (e.g., 2023 Bahrain) and click **Initialize Session**.
    *   *The first time you load a track, it might take 10-20 seconds for the Python server to download the cache.*

## ⚠️ Troubleshooting
*   **"Connection Failed":** Ensure `server.py` is running and says "Listening on http://localhost:5000".
*   **Slow Load:** Real F1 data is large. The first load downloads data to a `f1_cache` folder. Subsequent loads are instant.
