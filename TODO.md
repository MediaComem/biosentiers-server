# TODO

## Open questions

* Determine QR code validity (should it remain valid if zones change, or should it be best-effort with a notification?)
  * TBD
* POI linked to zone explicitly through foreign key or automatically through geometry?
  * Many-to-many poi/zone
  * Many-to-many zone/trail
* Should path types be pre-defined or free text?
  * Put path in trail