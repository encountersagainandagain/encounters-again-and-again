# Local typefaces

Original, unmodified variable fonts from Google Fonts, downloaded 2026-10-06:

- [EB Garamond](https://github.com/google/fonts/tree/main/ofl/ebgaramond): normal and italic. Copyright 2017 The EB Garamond Project Authors. License: `EB-Garamond-OFL.txt`.
- [Archivo](https://github.com/google/fonts/tree/main/ofl/archivo): normal. Copyright 2020 The Archivo Project Authors. License: `Archivo-OFL.txt`.

Both use SIL Open Font License 1.1. They are bundled with their notices and loaded through next/font/local. The handoff references these exact families but includes no font binaries. Builds require no font downloads.

Pages load WOFF2 copies (`*.woff2`) made from these originals by `node scripts/subset-fonts.mjs`: only the characters and weights the site uses (about 370 KB in all instead of 2.2 MB), with every glyph shape and OpenType feature of the kept characters unchanged.
