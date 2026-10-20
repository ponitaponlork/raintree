import importlib.util
import sys
import types
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class ToolResult:
    def __init__(self, llm_response):
        self.llm_response = llm_response


def load_tool_module(name, relative_path):
    """Load a Rasa tool module with minimal stand-ins for its SDK imports."""
    decorator_module = types.ModuleType("rasa.mantle.tools.decorator")
    decorator_module.ToolContext = type("ToolContext", (), {})
    decorator_module.tool = lambda **kwargs: (lambda function: function)
    result_module = types.ModuleType("rasa.mantle.tools.result")
    result_module.ToolResult = ToolResult
    modules = {
        "rasa": types.ModuleType("rasa"),
        "rasa.mantle": types.ModuleType("rasa.mantle"),
        "rasa.mantle.tools": types.ModuleType("rasa.mantle.tools"),
        "rasa.mantle.tools.decorator": decorator_module,
        "rasa.mantle.tools.result": result_module,
    }
    previous = {key: sys.modules.get(key) for key in modules}
    sys.modules.update(modules)
    try:
        spec = importlib.util.spec_from_file_location(name, ROOT / relative_path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    finally:
        for key, previous_module in previous.items():
            if previous_module is None:
                sys.modules.pop(key, None)
            else:
                sys.modules[key] = previous_module


class RiskProfileToolTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.module = load_tool_module("risk_profile_tools", "skills/risk_profile/tools.py")

    async def test_classifies_low_mid_and_high_scores(self):
        cautious = await self.module.score_risk_profile(5, 10, False, "new")
        balanced = await self.module.score_risk_profile(15, 30, False, "new")
        growth = await self.module.score_risk_profile(30, 40, False, "experienced")
        self.assertEqual(cautious.llm_response["illustrative_band"], "cautious")
        self.assertEqual(cautious.llm_response["conversation_score"], 20)
        self.assertEqual(balanced.llm_response["illustrative_band"], "balanced")
        self.assertEqual(balanced.llm_response["conversation_score"], 60)
        self.assertEqual(growth.llm_response["illustrative_band"], "growth-oriented")
        self.assertEqual(growth.llm_response["conversation_score"], 100)

    async def test_clamps_inputs_and_penalizes_near_term_liquidity(self):
        result = await self.module.score_risk_profile(100, -5, True, "advanced")
        self.assertEqual(result.llm_response["conversation_score"], 60)
        self.assertEqual(result.llm_response["illustrative_band"], "balanced")
        self.assertEqual(result.llm_response["inputs_considered"]["horizon_years"], 100)


class AllocationToolTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.module = load_tool_module("allocation_tools", "skills/allocation/tools.py")

    async def test_returns_each_defined_mix_and_educational_caveat(self):
        for band, expected in self.module.ILLUSTRATIVE.items():
            with self.subTest(band=band):
                result = await self.module.build_illustrative_allocation(
                    band, 12, "retirement", "some near-term access"
                )
                self.assertEqual(result.llm_response["allocation_percent"], expected)
                self.assertEqual(sum(expected.values()), 100)
                self.assertTrue(result.llm_response["illustrative_only"])
                self.assertIn("not a recommendation", result.llm_response["caveat"])

    async def test_rejects_unknown_band(self):
        result = await self.module.build_illustrative_allocation(
            "speculative", 10, "goal", "needs"
        )
        self.assertIn("error", result.llm_response)


class ProductComparisonToolTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.module = load_tool_module("product_comparison_tools", "skills/product_comparison/tools.py")

    async def test_default_returns_three_products_with_comparison_fields(self):
        result = await self.module.compare_products()
        products = result.llm_response["products"]
        self.assertEqual([product["ticker"] for product in products], ["VT", "BND", "AOM"])
        for product in products:
            self.assertTrue(product.get("annual_expense_ratio_percent") is not None or product.get("net_expense_ratio_percent") is not None)
            self.assertTrue(product["risk"])
            self.assertTrue(product["liquidity"])
            self.assertTrue(product["issuer_source"].startswith("https://"))

    async def test_filters_by_asset_class_or_name(self):
        bonds = await self.module.compare_products("bond")
        world = await self.module.compare_products("world stock")
        self.assertEqual([product["ticker"] for product in bonds.llm_response["products"]], ["BND"])
        self.assertEqual([product["ticker"] for product in world.llm_response["products"]], ["VT"])
        no_matches = await self.module.compare_products("not-found")
        self.assertEqual(no_matches.llm_response["products"], [])


if __name__ == "__main__":
    unittest.main()
