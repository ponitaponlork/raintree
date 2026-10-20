from rasa.mantle.tools.decorator import ToolContext, tool
from rasa.mantle.tools.result import ToolResult


@tool(description="Calculate an illustrative risk conversation band from the client's stated time horizon, loss comfort, liquidity needs, and investment experience. Do not call until all four have been discussed.")
async def score_risk_profile(
    horizon_years: int,
    comfortable_loss_percent: int,
    needs_access_within_year: bool,
    investing_experience: str,
    context: ToolContext = None,
) -> ToolResult:
    """Return a transparent educational risk band; not a suitability determination."""
    horizon = max(0, min(40, horizon_years))
    loss = max(0, min(60, comfortable_loss_percent))
    experience = investing_experience.strip().lower()
    score = min(100, (horizon * 2) + loss + (10 if experience in {"experienced", "advanced", "regular"} else 0) - (30 if needs_access_within_year else 0))
    if score < 30:
        band = "cautious"
    elif score < 65:
        band = "balanced"
    else:
        band = "growth-oriented"
    return ToolResult(llm_response={
        "illustrative_band": band,
        "conversation_score": score,
        "inputs_considered": {
            "horizon_years": horizon_years,
            "comfortable_temporary_loss_percent": comfortable_loss_percent,
            "needs_access_within_year": needs_access_within_year,
            "investing_experience": investing_experience,
        },
        "caveat": "An educational conversation aid only; not investment advice or a regulated suitability assessment.",
    })
