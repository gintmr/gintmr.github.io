# Official world-map source

`world-gs-2016-2948.jpg` is the unchanged JPEG served by the official
[Tianditu Beijing Standard Map Service](https://beijing.tianditu.gov.cn/bzdt/).
The service is operated by the Beijing Municipal Commission of Planning and
Natural Resources, with technical support from the Beijing Institute of
Surveying and Mapping. Its carousel labels this artwork “世界地图”,
1:1.3亿, 彩色.

- Direct source: <https://beijing.tianditu.gov.cn/bzdt/img/homeimg/world.jpg>
- Retrieved: 2026-09-11 over HTTPS with certificate verification enabled.
- Visible approval number: **GS(2016)2948号**.
- Visible attribution: **自然资源部 监制**.
- Dimensions: 800 × 513 pixels; JPEG; 106,796 bytes.
- SHA-256: `cfe5ea5d2d87f02267c80a04b2a1663d1170831545b1435510ba740c84812d79`.
- No cropping, recoloring, tracing, geographic substitution, or recompression
  has been applied to this file.

## Source status and limits

This is the official service's **web display JPEG**, not a downloaded EPS
master or a high-resolution print original. The Beijing download catalog
contains Beijing-area archives; a matching world-map EPS was not available
through that catalog. Searches for the exact approval number did not yield a
verifiable official EPS or higher-resolution original.

The national service's new hostname `bzdt.tianditu.gov.cn` did not resolve.
The older `bzdt.ch.mnr.gov.cn` returned a default Huawei WAF certificate for
`cn-north-4-WAF-Service`, rather than a valid certificate for the requested
hostname. TLS verification was not disabled. The alternative Tianjin service
failed validation because its certificate had expired.

The official service permits free download and requires keeping the approval
number. Its instructions call for review of edits to map content. Therefore
this raster should be displayed in full with its approval number and attribution
preserved; no dynamic country recoloring should be inferred from unrelated SVG
polygons. Country/region visitor counts can be shown beside the original image.

## Visual inspection, 11 September 2026

The downloaded image was opened and inspected as a whole, including the image
edges and bottom-right approval block. It shows the full world artwork,
including Antarctica, and the mainland China, Taiwan and Hainan shapes within
the East Asia area. The South China Sea area is present in the artwork.

At 800 × 513 pixels, small-island symbols and border details are too small for a
reliable island-by-island or province-level audit. This check confirms that the
local file preserves the official web artwork; it does **not** independently
certify every boundary or island, or claim that it reflects all changes since
the 2016 approval. Diaoyu/Chiwei and the individual South China Sea islands
cannot be conclusively checked at this resolution. Keep that limitation in
reports rather than asserting exhaustive coverage.

## Reproduce the download

```sh
curl --fail --location --show-error \
  'https://beijing.tianditu.gov.cn/bzdt/img/homeimg/world.jpg' \
  --output world-gs-2016-2948.jpg
shasum -a 256 world-gs-2016-2948.jpg
```
