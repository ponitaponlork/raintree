# Raintree — Wealth Advisory Agent

A small chat interface for a wealth-advisory conversation, backed by a Rasa Mantle agent. Oar is the name of the AI assistant. It supports structured risk conversations, comparison of sample products, and transparent illustrative allocations. It does not execute financial transactions.

## Run it

For the complete setup guide, see [`GUIDE.md`](./GUIDE.md). The instructions below cover the same setup in this README.

### Requirements

- Windows 10 or 11 with Python 3.10–3.13 installed.
- A Rasa license. See the [Rasa Mantle getting started guide](https://mantle.rasa.com/getting-started) for current access and setup requirements.
- An [OpenRouter API key](https://openrouter.ai/keys).

The project pins the pre-release Rasa Pro version listed in the Mantle quickstart. The model group uses OpenRouter's OpenAI-compatible endpoint with `nvidia/nemotron-3.5-super-vl:free`.

### 1. Create a virtual environment

Open PowerShell in the project folder and run:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

If PowerShell blocks activation, use the virtual environment's executables directly, for example:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\rasa.exe train
```

### 2. Add your credentials

Copy the example file and edit the copy:

```powershell
Copy-Item .env.example .env
notepad .env
```

Set these values in `.env` without surrounding quotes:

```dotenv
RASA_LICENSE=your-rasa-license
OPENROUTER_API_KEY=your-openrouter-api-key
```

`.env` is ignored by Git and should stay on your machine. PowerShell and Rasa do not automatically load it. In each PowerShell terminal that runs Rasa, load the values into that terminal's process environment:

```powershell
Get-Content .env | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]*)=(.*)$') {
        [Environment]::SetEnvironmentVariable($Matches[1].Trim(), $Matches[2].Trim(), 'Process')
    }
}
```

Keep that terminal open while Rasa is running. The frontend bridge does not need these credentials.

### 3. Train and start Rasa

In the first PowerShell terminal, load the `.env` values using the command above, then run:

```powershell
rasa train
rasa run
```

Rasa starts its REST channel at `http://127.0.0.1:5005` by default. The chat bridge uses that endpoint. To use a different REST webhook, set `RASA_WEBHOOK` before starting `server.py`.

### 4. Start the chat interface

Open a second PowerShell terminal in the project folder. Activate the virtual environment if desired, then run:

```powershell
python server.py
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser. Keep both the Rasa terminal and the chat server terminal running. Use this local HTTP address rather than opening `index.html` directly, so the chat can reach the local REST bridge.

The browser keeps a conversation sender ID for the current session and sends messages through the local bridge to Rasa's REST webhook. Set `RASA_WEBHOOK` to a different REST webhook URL if your Rasa server runs elsewhere.

## Agent skills

- `risk_profile` asks about time horizon, loss comfort, liquidity, and experience before calculating an explainable conversation band.
- `product_comparison` compares three named U.S.-listed ETF examples by asset class, issuer-reported expense ratio, liquidity, and risk.
- `allocation` returns a hypothetical cash/bond/equity allocation after the relevant client context has been discussed.

The product examples are real U.S.-listed ETFs, but they are static educational examples rather than live market data or personalized investment advice. This prototype has no account access, identity checks, or trade execution.

## Advisory profile updates

The profile page is populated by Rasa, not by manual client fields. The bridge removes the invisible marker that Oar adds after the relevant tools run and forwards it as a REST message's `custom.client_profile` object. The fields update these browser-side values:

- `client_profile.risk_level` → `client.advisorySnapshot.riskLevel`
- `client_profile.asset_allocation.cash`, `.bonds`, and `.equities` → `client.advisorySnapshot.allocation`

The UI accepts either snake_case or camelCase field names:

```json
{
  "text": "Your discussion suggests a balanced risk level.",
  "custom": {
    "client_profile": {
      "risk_level": "balanced",
      "asset_allocation": { "cash": 5, "bonds": 40, "equities": 55 }
    }
  }
}
```
