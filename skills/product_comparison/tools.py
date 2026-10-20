from rasa.mantle.tools.decorator import ToolContext, tool
from rasa.mantle.tools.result import ToolResult

PRODUCTS = [
    {
        "id": "vt",
        "ticker": "VT",
        "name": "Vanguard Total World Stock ETF",
        "asset_class": "global equities",
        "annual_expense_ratio_percent": 0.06,
        "risk": "global equity market, foreign currency, and emerging-markets risk; value can fall materially",
        "liquidity": "U.S.-listed ETF on NYSE Arca; secondary-market liquidity and bid/ask spreads vary",
        "issuer_source": "https://advisors.vanguard.com/investments/products/vt/vanguard-total-world-stock-etfp",
    },
    {
        "id": "bnd",
        "ticker": "BND",
        "name": "Vanguard Total Bond Market ETF",
        "asset_class": "U.S. investment-grade bonds",
        "annual_expense_ratio_percent": 0.03,
        "risk": "interest-rate, credit, prepayment, and inflation risk; value can fall",
        "liquidity": "U.S.-listed ETF on NYSE Arca; secondary-market liquidity and bid/ask spreads vary",
        "issuer_source": "https://advisors.vanguard.com/investments/products/bnd/vanguard-total-bond-market-etf",
    },
    {
        "id": "aom",
        "ticker": "AOM",
        "name": "iShares Core 40/60 Moderate Allocation ETF",
        "asset_class": "multi-asset allocation",
        "net_expense_ratio_percent": 0.15,
        "risk": "market and allocation risk across the underlying equity and fixed-income funds; not capital guaranteed",
        "liquidity": "U.S.-listed ETF on NYSE Arca; secondary-market liquidity and bid/ask spreads vary",
        "issuer_source": "https://www.ishares.com/us/products/239765/AOM",
    },
]


@tool(description="Compare three named U.S.-listed ETF examples by asset class, issuer-reported expense ratio, risk, and ETF trading liquidity. Use for education only; do not recommend a product.")
async def compare_products(
    asset_class: str = "all",
    context: ToolContext = None,
) -> ToolResult:
    """Return mock products matching a requested asset class."""
    query = asset_class.strip().lower()
    products = PRODUCTS if query in {"", "all", "any"} else [p for p in PRODUCTS if query in p["asset_class"].lower() or query in p["name"].lower()]
    return ToolResult(llm_response={
        "data_status": "Real U.S.-listed ETF examples. Issuer facts checked 2026-10-19; expenses, holdings, and trading conditions can change. Educational comparison only, not a recommendation.",
        "currency": "USD",
        "expense_ratio_note": "Expense ratios are annual fund expenses. Brokerage commissions, bid/ask spreads, taxes, and other costs may apply.",
        "products": products,
    })
