# Cookie Policy and consent banner

Built from the Stellantis "Cookie requirements" (Cookie_requirements_EN_CLEAN_10032026.docx). English only, like the site.

- `site-footer.html`: site-wide footer code (Site settings → Custom code → Footer). It contains the consent banner
  ("Continue without accepting", "Manage my settings", "Accept all"), the 4 categories, the 6-month expiry of the
  choice and the "Cookie Settings" link in the footer. API: `window.stlConsent` and the `stl:consent` event.
  Scripts that need consent go in as `<script type="text/plain" data-consent="performance">`.
- `policy.html`: content of the Embed on the `/cookie-policy` page (official text, `#cookie-settings`, `#cookie-list`).
  Add a row to the List table for every new cookie or tracking tool.
- The page head CSS of `/cookie-policy` stacks the List table as cards on mobile.
