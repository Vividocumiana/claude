# Privacy Policy (Webflow page `/privacy-policy`)

Official Stellantis policy ("PrivacyPolicy_CorpWeb_nocons", EN / FR / IT), converted from the
Word files to HTML. Each `<lang>.html` is pasted as-is into one Embed element of the
Webflow page; the page code adds the English / Français / Italiano selector
(`#en`, `#fr`, `#it` in the URL select a language).

`icons.txt` lists the 13 "Data Protection Icons" uploaded to the Webflow assets.

To update after Stellantis sends new Word files (same layout):

    python3 convert.py /path/to/folder-with-the-docx/

then replace the content of the three Embed elements and publish.
