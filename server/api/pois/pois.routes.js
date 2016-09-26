var express = require('express'),
    utils = require('../utils');

var router = express.Router();

/**
 * @api {POST} /pois Create a POI
 * @apiGroup POIs
 * @apiName CreatePoi
 * @apiDescription Add a new point of interest (e.g. a bird, blower, garden, etc) to the database.
 *
 * There are different types of points of interest, classified into two main categories: **areas** and **points**.
 *
 * Area types are:
 * * `GreenRoof`
 * * `EcoArea`
 * * `Watercourse`
 * * `WetArea`
 * * `Territory`
 * * `WildlifeCorridor`
 * * `Flower`
 * * `BirdTerritory`
 *
 * Point types are:
 * * `BirdObs`
 * * `Butterfly`
 * * `Garden`
 * * `Biodivercity`
 * * `Maintenance`
 * * `SpecialInterest`
 *
 * @apiUse Authorization
 * @apiUse Validation
 * @apiUse PoiResponse
 *
 * @apiParam (JSON parameters) {String="GreenRoof","EcoArea","Watercourse","WetArea","Territory","WildlifeCorridor","Flower","BirdTerritory","BirdObs","Butterfly","Garden","Biodivercity","Maintenance","SpecialInterest"} type The type of POI to create.
 * @apiParam (JSON parameters) {String} ownerId The ID of the owner who reported the POI.
 * @apiParam (JSON parameters) {String} surface **Areas** only. The type of surface the POI was found on (e.g. grass, dirt).
 * @apiParam (JSON parameters) {String} comment Except for `Biodivercity`, `Flower`, `BirdTerritory`, `Garden`, `Butterfly`, `BirdObs`. The type of surface the POI was found on (e.g. grass, dirt).
 * @apiParam (JSON parameters) {GeoJSON} geometry The geometry of the POI (e.g. a Point or MultiPolygon).
 * @apiParam (JSON parameters) {String} name `Watercourse`, `Garden` and `SpecialInterest` only. The name of the POI (e.g. the name of a river).
 * @apiParam (JSON parameters) {String} wetAreaTypeId `WetArea` only. The ID of the wet area type (see the [WetAreaTypes](#api-WetAreaTypes) resource).
 * @apiParam (JSON parameters) {String} wildCorridorTypeId `WildCorridor` only. The ID of the wild corridor type (see the [WildCorridorTypes](#api-WildCorridorTypes) resource).
 * @apiParam (JSON parameters) {String} flowerTypeId `Flower` only. The ID of the flower type (see the [FlowerTypes](#api-FlowerTypes) resource).
 * @apiParam (JSON parameters) {String} flowerSpeciesId `Flower` only. The ID of the flower species (see the [FlowerSpecies](#api-FlowerSpecies) resource).
 * @apiParam (JSON parameters) {String} birdSpeciesId `BirdTerritory` only. The ID of the bird species (see the [BirdSpecies](#api-BirdSpecies) resource).
 * @apiParam (JSON parameters) {Integer} nbObsMale `BirdTerritory` only. The number of times a male bird was sighted in the territory.
 * @apiParam (JSON parameters) {Integer} nbObsFemale `BirdTerritory` only. The number of times a female bird was sighted in the territory.
 * @apiParam (JSON parameters) {Integer} nbObsChild `BirdTerritory` only. The number of times a child bird was sighted in the territory.
 *
 * @apiExample GreenRoof
 * POST /api/v1/pois HTTP/1.1
 * Content-Type: application/json
 *
 * {
 *   "type": "GreenRoof",
 *   "ownerId": "30cf9aa8-81d0-4456-ae79-c35cca85d166",
 *   "geometry": {
 *     "type": "MultiPolygon",
 *     "coordinates": [
 *       [ [ [102.0, 2.0], [103.0, 2.0], [103.0, 3.0], [102.0, 3.0], [102.0, 2.0] ] ]
 *     ]
 *   },
 *   "comment": "It looks green."
 * }
 *
 * @apiExample BirdTerritory
 * POST /api/v1/pois HTTP/1.1
 * Content-Type: application/json
 *
 * {
 *   "type": "BirdTerritory",
 *   "ownerId": "30cf9aa8-81d0-4456-ae79-c35cca85d166",
 *   "birdSpeciesId": "6f199d04-a7e0-4dbb-b417-1d0a1afaed5a",
 *   "nbObsMale": 12,
 *   "nbObsFemale": 23,
 *   "nbObsChild": 4,
 *   "geometry": {
 *     "type": "MultiPolygon",
 *     "coordinates": [
 *       [ [ [102.0, 2.0], [103.0, 2.0], [103.0, 3.0], [102.0, 3.0], [102.0, 2.0] ] ]
 *     ]
 *   }
 * }
 */
router.post('/', utils.notYetImplemented);

/**
 * @api {GET} /pois List POIs
 * @apiName ListPois
 * @apiGroup POIs
 *
 * @apiUse Pagination
 * @apiUse Authorization
 * @apiUse PoiResponse
 *
 * @apiParam (Query parameters) {String} types The types of POIs to list. This parameter can be supplied more than once.
 * @apiParamExample types
 * ?types=GreenRoof&types=SpecialInterest
 *
 * @apiSuccessExample Success 200
 * HTTP/1.1 200 OK
 *
 * [
 *   {
 *     "id": "4b4f991d-8b59-47e6-8749-a43d0058384a"
 *     "type": "GreenRoof",
 *     "ownerId": "30cf9aa8-81d0-4456-ae79-c35cca85d166",
 *     "geometry": {
 *       "type": "MultiPolygon",
 *       "coordinates": [
 *         [ [ [102.0, 2.0], [103.0, 2.0], [103.0, 3.0], [102.0, 3.0], [102.0, 2.0] ] ]
 *       ]
 *     },
 *     "comment": "It looks green."
 *   },
 *   {
 *     "id": "89d8110a-5c28-4718-81ce-2194e98af063"
 *     "type": "SpecialInterest",
 *     "name": "Tour start",
 *     "geometry": {
 *       "type": "Point",
 *       "coordinates": [ 102.0, 2.0 ]
 *     }
 *   }
 * ]
 */
router.get('/', utils.notYetImplemented);

module.exports = router;

/**
 * @apiDefine PoiResponse
 *
 * @apiSuccess (Success 200/201) {String} id The identifier of the POI.
 * @apiSuccess (Success 200/201) {Number} perimeter **Areas** only. The perimeter of the POI's area.
 * @apiSuccess (Success 200/201) {String} createdAt The date at which the POI was created (ISO-8601).
 * @apiSuccess (Success 200/201) {String} updatedAt The date at which the POI was last modified (ISO-8601).
 */
