# F1 Engineer Dashboard

A professional-grade F1 telemetry dashboard for local race analysis.

## 🚀 How to Run Locally

### 1. Prerequisites
Ensure you have Python 3.9+ installed.

### 2. Installation
Open your terminal in this folder and run:
```bash
pip install -r requirements.txt
```

### 3. Start the Dashboard
Run the following command:
```bash
python server.py
```

### 4. Open in Browser
Once the server starts, open your browser and go to:
**[http://localhost:5000](http://localhost:5000)**

---

## 💡 Pro Tips
*   **Initial Load**: The first time you select a specific race (e.g., 2024 Bahrain), it will take about 20-30 seconds to download the F1 telemetry. Look at your terminal for progress updates.
*   **Offline Mode**: Once a race is downloaded, it is cached in the `f1_cache` folder and will load instantly next time.
*   **Development**: Since `server.py` serves the files, any changes you make to `.tsx` files will be automatically reflected when you refresh the browser (compiled live via Babel).