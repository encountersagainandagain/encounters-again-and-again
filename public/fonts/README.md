# Local typefaces

Original, unmodified variable fonts from Google Fonts, downloaded 2026-10-06:

- [EB Garamond](https://github.com/google/fonts/tree/main/ofl/ebgaramond): normal and italic. Copyright 2017 The EB Garamond Project Authors. License: `EB-Garamond-OFL.txt`.
- [Archivo](https://github.com/google/fonts/tree/main/ofl/archivo): normal. Copyright 2020 The Archivo Project Authors. License: `Archivo-OFL.txt`.

Both use SIL Open Font License 1.1. They are bundled with their notices and loaded through next/font/local. The handoff references these exact families but includes no font binaries. Builds require no font downloads.

Pages load WOFF2 copies (`*.woff2`) made from these originals by `node scripts/subset-fonts.mjs`: only the characters the site uses and the OpenType features browsers apply by default plus `tnum` (about 170 KB in all instead of 2.2 MB). The whole weight axis is kept: every glyph shape and position at the weights the site uses matches the original files (checked in Chrome, 2026-10-23).
