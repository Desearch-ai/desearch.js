# Changelog

## 1.6.0

- Added `card` to `TwitterScraperTweet` and the `TwitterScraperCard` type: the link preview, video player or live broadcast shown under a tweet, with the linked page's title, description and image.

## 1.5.1

- Bounded `undici` to `^6.28.1 || ^7.29.1` (fixes import crash on Node 20 from undici 8).
- Added a named `Desearch` export alongside the existing default export.
- Node 18 is no longer supported (`engines` >=20.18.1).
