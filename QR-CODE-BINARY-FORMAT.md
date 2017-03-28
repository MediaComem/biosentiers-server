# API

## Binary QR code format (version 0)

Offsets are in bytes.

field            | offset | size     | type                                | description
:---             | :---   | :---     | :---                                | :---
version          | 0      | 1 byte   | uint8                               | The binary format version (0-255)
creator name     | 1      | 40 bytes | utf-8 string                        | The name of the user who manages the excursion
excursion id     | 41     | 5 bytes  | utf-8 string                        | The unique identifier of the excursion
excursion date   | 46     | 4 bytes  | unix timestamps in seconds (uint32) | The date at which the excursion was planned
excursion name   | 50     | 60 bytes | utf-8 string                        | The name of the excursion
participant id   | 110    | 2 bytes  | utf-8 string                        | The identifier of the participant (unique for the excursion)
participant name | 112    | 20 bytes | utf-8 string                        | The name of the participant
POI type(s)      | 132    | 1 byte   | bitmask (uint8)                     | A bitmask where each bit is a boolean flag to activate (1) or deactivate (0) each POI type
zone(s)          | 133    | 1 byte   | bitmask (uint8)                     | A bitmask where each bit is a boolean flag to activate (1) or deactivate (0) each zone in the trail

### POI types

type      | bitmask offset
:---      | :---
bird      | 0
butterfly | 1
flower    | 2
tree      | 3

### Trail zones

To be defined...
