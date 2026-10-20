# Getting started with Oar

Oar is a simple chat interface backed by a Rasa Mantle wealth-advisory agent. The agent can guide an educational risk conversation, compare named ETF examples, and explain a hypothetical allocation. It does not have account access or live market data, and it cannot place trades.

## What you need

- Windows 10 or 11 with Python 3.10–3.13 installed.
- A Rasa license. See the [Rasa Mantle getting started guide](https://mantle.rasa.com/getting-started) for current access and setup requirements.
- An [OpenRouter API key](https://openrouter.ai/keys). The project is configured to use `nvidia/nemotron-3.5-super-vl:free` through OpenRouter's OpenAI-compatible API. OpenRouter lists this model as supporting tool calls.

## 1. Create a virtual environment

Open PowerShell in the project folder and run:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

If PowerShell blocks activation, use the virtual environment's executables directly, for example `.\.venv\Scripts\python.exe -m pip install -r requirements.txt` and `.\.venv\Scripts\rasa.exe train`.

The pinned Rasa Pro version follows the version in the [Mantle quickstart](https://mantle.rasa.com/getting-started). Mantle is pre-release in that guide, so keep the version pinned when installing.

## 2. Add your credentials

Copy the example file and edit the copy:

```powershell
Copy-Item .env.example .env
notepad .env
```

Set the two values in `.env`:

```dotenv
RASA_LICENSE=your-rasa-license
OPENROUTER_API_KEY=your-openrouter-api-key
```

Do not add quotes around the values. `.env` is ignored by Git and should stay on your machine.

PowerShell and Rasa do not automatically load this file. In each PowerShell terminal that runs Rasa, load the values into that terminal's process environment:

```powershell
Get-Content .env | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]*)=(.*)$') {
        [Environment]::SetEnvironmentVariable($Matches[1].Trim(), $Matches[2].Trim(), 'Process')
    }
}
```

Keep that terminal open while Rasa is running. The frontend bridge does not need these credentials.

## 3. Train and start the Rasa agent

In the first PowerShell terminal, load the `.env` values using the command above, then run:

```powershell
rasa train
rasa run
```

Rasa starts its REST channel on `http://127.0.0.1:5005` by default. The chat bridge is configured to use that endpoint. To use a different REST webhook, set `RASA_WEBHOOK` before starting `server.py`.

## 4. Start the chat interface

Open a second PowerShell terminal in the project folder. Activate the virtual environment if desired, then run:

```powershell
python server.py
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser. Keep both the Rasa terminal and the chat server terminal running. Open the page over this local HTTP address rather than opening `index.html` directly, so the chat can reach the local REST bridge.

## Try a conversation

Start with a normal message, such as:

- “I’m investing for a goal about ten years away. Can you help me think through my risk comfort?”
- “Compare the sample global equity and short-duration bond funds.”
- “What would an illustrative balanced allocation look like, and what are the risks?”

The assistant should ask for missing context before producing a risk band or allocation. Product names and expense ratios are fixed, issuer-sourced examples rather than live market data or investment recommendations.

## Project map

- `agent.yml` — Oar's identity and global advisory boundaries.
- `integrations.yml` — OpenRouter model configuration and Rasa REST/Inspector channels.
- `skills/risk_profile/` — risk conversation and transparent risk-band tool.
- `skills/product_comparison/` — named U.S.-listed ETF examples and comparison tool.
- `skills/allocation/` — illustrative allocation tool.
- `server.py` — serves the UI and forwards chat requests to Rasa.
- `index.html`, `styles.css`, `app.js` — the chat interface.

For Mantle skill and tool authoring, see the [Rasa skills guide](https://mantle.rasa.com/skills) and [tools guide](https://mantle.rasa.com/concepts/tools).
