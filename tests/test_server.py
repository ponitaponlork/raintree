import unittest

import server


class ProfileFromTextTests(unittest.TestCase):
    def test_extracts_risk_and_complete_allocation(self):
        profile = server.profile_from_text(
            "Risk level: Growth oriented.\n"
            "Illustrative allocation: Cash: 5%, Bonds: 20%, Equities: 75%."
        )
        self.assertEqual(profile, {
            "risk_level": "growth-oriented",
            "asset_allocation": {"cash": 5.0, "bonds": 20.0, "equities": 75.0},
        })

    def test_accepts_case_spacing_and_decimal_values(self):
        profile = server.profile_from_text(
            "RISK PROFILE - BALANCED\nCash 2.5% / BONDS: 37.5% / equities: 60%"
        )
        self.assertEqual(profile["risk_level"], "balanced")
        self.assertEqual(profile["asset_allocation"], {
            "cash": 2.5, "bonds": 37.5, "equities": 60.0,
        })

    def test_uses_last_risk_level_and_does_not_emit_partial_allocation(self):
        profile = server.profile_from_text(
            "Risk level: cautious. Later, risk band: balanced. Cash: 10%, Bonds: 60%."
        )
        self.assertEqual(profile, {"risk_level": "balanced"})

    def test_ignores_out_of_range_allocation_values(self):
        profile = server.profile_from_text(
            "Cash: 101%, Bonds: 40%, Equities: 60%. Risk level: cautious."
        )
        self.assertEqual(profile, {"risk_level": "cautious"})


if __name__ == "__main__":
    unittest.main()
