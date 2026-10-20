# Oar — Wealth Advisory Agent

A small chat interface for a wealth-advisory conversation, backed by a Rasa Mantle agent. It supports structured risk conversations, comparison of sample products, and transparent illustrative allocations. It does not execute financial transactions.

## Run it

The current Mantle quickstart requires Python 3.10–3.13, a Rasa license, and an OpenRouter API key. The project pins the pre-release version listed in the [Rasa Mantle getting started guide](https://mantle.rasa.com/getting-started). The model group uses OpenRouter's OpenAI-compatible endpoint with `nvidia/nemotron-3.5-super-vl:free`.

1. Create and activate a virtual environment, then install `requirements.txt`.
2. Copy `.env.example` to `.env` and fill in `RASA_LICENSE` and `OPENROUTER_API_KEY`. Load those variables into your shell before launching Rasa. Do not commit actual secrets.
3. From this folder, run `rasa train` and then `rasa run`.
4. In another terminal, run `python server.py` and open `http://127.0.0.1:8000`.

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
