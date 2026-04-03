# 💰 Discounted Cash Flow Calculator

A value-investing tool that mines live financial data from Yahoo Finance and computes **intrinsic value** for a curated list of stocks using a DCF model — all in a sleek dark-themed UI.

---

## ✨ Features

- 📊 **Live financial data** — pulls FCF, Net Income, shares outstanding, and more via [yfinance](https://github.com/ranaroussi/yfinance)
- 🏦 **Smart metric selection** — uses Net Income for financial-sector companies (banks like JPM, BRK-B) where FCF is meaningless
- 💱 **Live FX conversion** — automatically converts foreign-currency financials (JPY, EUR, etc.) to USD using real-time exchange rates
- 🧮 **10-year DCF model** — 5 years of near-term growth fading into a terminal rate, discounted back to present value
- 🎚️ **Interactive sliders** — adjust discount rate, near-term growth, terminal growth, and margin of safety on the fly
- 🟢🟡🔴 **Buy / Hold / Sell signals** — color-coded badges based on intrinsic value vs. current price
- 🌑 **Dark theme** — easy on the eyes with gold accent highlights

---

## 🗂️ Project Structure

```
discount_cashflow_calculator/
├── Dockerfile               # 🐳  Multi-stage build (Python → Node → serve)
├── docker-compose.yml       # 🐳  One-command local deployment
├── .dockerignore
│
└── dcf-app/
    ├── client/                  # 🖥️  React + Vite frontend
    │   ├── dcf-calculator.jsx   #     Main DCF calculator component
    │   ├── main.jsx             #     React entry point
    │   ├── index.html           #     Vite HTML shell
    │   ├── vite.config.js       #     Vite config
    │   └── package.json
    │
    ├── server/                  # 🐍  Python data-mining backend
    │   ├── app/
    │   │   ├── main.py          #     Entry point — runs the mining script
    │   │   └── utils/
    │   │       └── mine_company_financial.py  # 🔧 Core: fetches & transforms data
    │   ├── data/
    │   │   └── companies-financials.json     # 📁 Generated output (gitignored)
    │   └── requirements.txt
    │
    └── README.md
```

---

## 🚀 Getting Started

### 🐳 Option A — Docker (recommended)

The easiest way to run the app locally. No Python or Node installation required.

**Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/)

```bash
docker compose up --build
```

Then open `http://localhost:3000`.

> The build automatically fetches live financial data from Yahoo Finance and compiles the UI — all in one step.

To stop:
```bash
docker compose down
```

To refresh financial data, rebuild the image:
```bash
docker compose up --build
```

---

### 💻 Option B — Manual (local dev)

**Prerequisites:**

- **Node.js** ≥ 18
- **Python** ≥ 3.10
- **pip**

### 1️⃣ Install Python dependencies

```bash
cd dcf-app/server
pip install -r requirements.txt
```

### 2️⃣ Mine financial data

```bash
cd dcf-app
python server/app/main.py
```

This fetches live data for all tracked tickers and writes `server/data/companies-financials.json`.

### 3️⃣ Start the dev server

```bash
cd dcf-app/client
npm install
npm run dev
```

Open the URL printed by Vite (usually `http://localhost:5173`).

---

## 📈 Tracked Companies

| Ticker | Company | Notes |
|--------|---------|-------|
| DE | Deere & Company | 🚜 |
| CAT | Caterpillar | 🏗️ |
| MIELY | Mitsubishi Electric | ⚡ JPY → USD converted |
| HESAY | Hermès | 👜 EUR → USD converted |
| PM | Philip Morris International | 🚬 |
| HLT | Hilton Worldwide | 🏨 |
| JPM | JPMorgan Chase | 🏦 Uses Net Income |
| BRK-B | Berkshire Hathaway | 🏦 Uses Net Income |
| GE | GE Aerospace | ✈️ |
| MS | Morgan Stanley | 🏦 Uses Net Income |
| GS | Goldman Sachs | 🏦 Uses Net Income |
| GOOGL | Alphabet | 🔍 |
| META | Meta Platforms | 👤 |
| MSFT | Microsoft | 💻 |
| AXP | American Express | 💳 Uses Net Income |
| SPGI | S&P Global | 📊 Uses Net Income |
| RACE | Ferrari | 🏎️ EUR → USD converted |

Edit the `TICKERS` list in `server/app/main.py` to track different stocks.

---

## 🧮 How the DCF Model Works

1. **Inputs** — trailing-twelve-month FCF (or Net Income), growth rates, discount rate
2. **Near-term (years 1–5)** — cash flows grow at the user-set near-term rate
3. **Fade (years 6–10)** — growth linearly fades from near-term to terminal rate
4. **Terminal value** — perpetuity growth model applied at year 10
5. **Discount** — all future cash flows discounted back at the chosen rate
6. **Intrinsic value per share** = total present value ÷ shares outstanding
7. **Signal** — compare intrinsic value to market price with a margin of safety

---

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| ⚛️ Frontend | React 19 + Vite 6 |
| 🐍 Backend | Python 3 + yfinance |
| 📦 Data | Static JSON (generated) |
| 💱 FX Rates | Live via yfinance currency pairs |
| 🐳 Deployment | Docker (multi-stage) + docker-compose |

---

## 📝 License

For personal / educational use. Financial data sourced from Yahoo Finance — subject to their terms of service.
