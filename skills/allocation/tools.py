from rasa.mantle.tools.decorator import ToolContext, tool
from rasa.mantle.tools.result import ToolResult

ILLUSTRATIVE = {
    "cautious": {"cash": 10, "bonds": 60, "equities": 30},
    "balanced": {"cash": 5, "bonds": 40, "equities": 55},
    "growth-oriented": {"cash": 5, "bonds": 20, "equities": 75},
}


@tool(description="Build a hypothetical percentage allocation across cash, bonds, and diversified equities using a previously discussed risk conversation band. This is educational, not personalized advice.")
async def build_illustrative_allocation(
    risk_band: str,
    horizon_years: int,
    goal: str,
    liquidity_needs: str,
    context: ToolContext = None,
) -> ToolResult:
    """Return a transparent sample allocation and its main caveats."""
    band = risk_band.strip().lower()
    if band not in ILLUSTRATIVE:
        return ToolResult(llm_response={"error": "Use one of: cautious, balanced, growth-oriented. Discuss the band with the client first."})
    allocation = ILLUSTRATIVE[band]
    return ToolResult(llm_response={
        "illustrative_only": True,
        "goal_context": goal,
        "horizon_years": horizon_years,
        "liquidity_needs": liquidity_needs,
        "risk_band": band,
        "allocation_percent": allocation,
        "rationale": "Longer horizons may allow more exposure to assets with higher volatility; bonds can moderate portfolio swings; cash can support near-term liquidity. These are broad educational trade-offs, not a forecast.",
        "risks": ["Equity and bond values can fall, and investors can lose principal.", "Inflation can reduce purchasing power.", "Taxes, fund fees, currency exposure, and withdrawal timing affect outcomes."],
        "caveat": "Hypothetical example only; not a recommendation or suitability assessment. Review with a licensed adviser before acting.",
    })
