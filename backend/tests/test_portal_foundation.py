from __future__ import annotations

import unittest

from app.models import PortalAccount, Wzc


class PortalFoundationTests(unittest.TestCase):
    def test_portal_account_requires_one_wzc_and_defaults_active(self) -> None:
        columns = PortalAccount.__table__.c
        self.assertFalse(columns.wzc_id.nullable)
        self.assertEqual(next(iter(columns.wzc_id.foreign_keys)).target_fullname, "wzcs.id")
        self.assertIs(columns.is_active.default.arg, True)
        self.assertEqual(columns.role.default.arg, "staff")

    def test_portal_account_has_unique_email_and_wzc_relationship(self) -> None:
        indexes = PortalAccount.__table__.indexes
        self.assertTrue(any(item.unique and "email" in item.columns for item in indexes))
        self.assertEqual(PortalAccount.wzc.property.back_populates, "portal_accounts")
        self.assertEqual(Wzc.portal_accounts.property.back_populates, "wzc")

    def test_portal_account_is_separate_from_internal_user_table(self) -> None:
        self.assertEqual(PortalAccount.__tablename__, "portal_accounts")


if __name__ == "__main__":
    unittest.main()
