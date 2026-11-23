# Vietnam administrative catalog

`vietnam-administrative-units.json` contains 34 provincial units and 3,321 commune-level units (wards, communes and special zones). It is a compact copy of the Vietnamese-only JSON from [thanglequoc/vietnamese-provinces-database](https://github.com/thanglequoc/vietnamese-provinces-database/blob/master/json/vn_only_simplified_json_generated_data_vn_units_minified.json), retrieved on 2026-11-23. The upstream project is MIT licensed, Copyright (c) 2021 Thang Le Quoc; see its [license](https://github.com/thanglequoc/vietnamese-provinces-database/blob/master/LICENSE).

The expected counts and code format follow [Decision 19/2025/QD-TTg](https://xaydungchinhsach.chinhphu.vn/bang-danh-muc-va-ma-so-cua-34-tinh-thanh-moi-cac-don-vi-hanh-chinh-cap-xa-moi-11925070418263625.htm). The copied names and mappings come from the third-party dataset, not directly from the legal text. Review the dataset against official updates before refreshing it.

Existing listings only have historical `district` text. Migration `1700000005000_listing_administrative_units.js` leaves their new codes null. Province/ward searches match listings only after their location has been verified and `province_code` and `ward_code` have been populated. Do not infer these codes from district names alone after the mergers.
