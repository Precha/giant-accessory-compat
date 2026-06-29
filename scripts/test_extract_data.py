import unittest

from extract_data import parse_compat_cell, sanitize_sku, slugify
from extract_data import build_data, XLSX_PATH


class SlugifyTests(unittest.TestCase):
    def test_brand_and_name_become_hyphenated_lowercase_id(self):
        self.assertEqual(slugify("GIANT-ATX 27.5"), "giant-atx-27-5")
        self.assertEqual(slugify("Liv-Alight"), "liv-alight")

    def test_collapses_repeated_separators(self):
        self.assertEqual(slugify("Liv-Talon 29er"), "liv-talon-29er")


class SanitizeSkuTests(unittest.TestCase):
    def test_plain_numeric_sku_is_unchanged(self):
        self.assertEqual(sanitize_sku(530000050), "530000050")

    def test_sku_with_parenthetical_alt_code_is_hyphenated(self):
        self.assertEqual(sanitize_sku("710613 (711004)"), "710613-711004")
        self.assertEqual(sanitize_sku("440000003 (71053)"), "440000003-71053")


class ParseCompatCellTests(unittest.TestCase):
    def test_plain_circle_is_yes(self):
        self.assertEqual(parse_compat_cell("○"), {"status": "yes"})

    def test_x_is_no(self):
        self.assertEqual(parse_compat_cell("X"), {"status": "no"})

    def test_soft_hyphen_is_accessory(self):
        self.assertEqual(parse_compat_cell("\xad"), {"status": "accessory"})

    def test_circle_with_note_strips_asterisk_and_whitespace(self):
        self.assertEqual(
            parse_compat_cell("○\n* need adapter"),
            {"status": "yes", "note": "need adapter"},
        )
        self.assertEqual(
            parse_compat_cell("○\n*need adapter"),
            {"status": "yes", "note": "need adapter"},
        )

    def test_circle_with_note_fixes_source_typo(self):
        self.assertEqual(
            parse_compat_cell("○\n*need the seat tube strap moutning kit"),
            {"status": "yes", "note": "need the seat tube strap mounting kit"},
        )

    def test_none_raises(self):
        with self.assertRaises(ValueError):
            parse_compat_cell(None)

    def test_unrecognized_symbol_raises(self):
        with self.assertRaises(ValueError):
            parse_compat_cell("???")


class BuildDataIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = build_data(XLSX_PATH)

    def test_counts_match_known_shape_of_the_source_file(self):
        self.assertEqual(len(self.data["models"]), 35)
        self.assertEqual(len(self.data["fenders"]), 22)
        self.assertEqual(len(self.data["racks"]), 16)
        self.assertEqual(len(self.data["kickstands"]), 3)

    def test_every_model_has_a_compat_entry_for_every_product(self):
        all_product_ids = {p["id"] for p in self.data["fenders"]} | {p["id"] for p in self.data["racks"]}
        for model in self.data["models"]:
            entry = self.data["compat"][model["id"]]
            self.assertEqual(set(entry.keys()), all_product_ids)

    def test_known_incompatible_pair(self):
        # GIANT ATX 27.5 vs GIANT SPEEDSHIELD RGX 45 FENDER (sku 530000050) is "X" in the sheet.
        entry = self.data["compat"]["giant-atx-27-5"]["530000050"]
        self.assertEqual(entry, {"status": "no"})

    def test_known_compatible_pair_with_note(self):
        # Liv Alight vs the same fender is "yes" with a seat-tube-strap-mounting-kit note.
        entry = self.data["compat"]["liv-alight"]["530000050"]
        self.assertEqual(entry["status"], "yes")
        self.assertIn("seat tube strap mounting kit", entry["note"])

    def test_fender_and_rack_products_have_image_paths(self):
        for product in self.data["fenders"] + self.data["racks"]:
            self.assertIsNotNone(product["image"], product["name"])

    def test_kickstand_text_blocks_are_populated(self):
        first = self.data["kickstands"][0]
        self.assertIn("Roam MY21+", first["compatibleBikesText"])


if __name__ == "__main__":
    unittest.main()
