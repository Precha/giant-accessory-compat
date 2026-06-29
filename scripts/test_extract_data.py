import unittest

from extract_data import parse_compat_cell, sanitize_sku, slugify


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


if __name__ == "__main__":
    unittest.main()
