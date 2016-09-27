var express = require('express'),
    utils = require('../utils');

var router = express.Router();

/**
 * @api {POST} /flower-species Create a flower species
 * @apiGroup FlowerSpecies
 * @apiName CreateFlowerSpecies
 * @apiDescription Create a new flower species.
 *
 * @apiUse Authorization
 * @apiUse Validation
 * @apiUse FlowerSpeciesResponse
 *
 * @apiParam (JSON parameters) {String} commonName The common name of the species.
 * @apiParam (JSON parameters) {String} scientificName The scientific name of the species.
 *
 * @apiExample Example
 * POST /api/v1/flower-species HTTP/1.1
 * Content-Type: application/json
 *
 * {
 *   "commonName": "Lilium",
 *   "scientificName": "Lilium carniolicum"
 * }
 *
 * @apiSuccessExample Success 201
 * HTTP/1.1 201 Created
 * Content-Type: application/json
 *
 * {
 *   "id": "021789b6-e16c-4aa0-9cf8-38812fbce49f",
 *   "commonName": "Lilium",
 *   "scientificName": "Lilium carniolicum",
 *   "createdAt": "2016-01-01T09:30:15Z",
 *   "updatedAt": "2016-01-01T09:30:15Z"
 * }
 */
router.post('/', utils.notYetImplemented);

/**
 * @api {GET} /flower-species List flower species
 * @apiName ListFlowerSpecies
 * @apiGroup FlowerSpecies
 *
 * @apiUse Pagination
 * @apiUse Authorization
 * @apiUse FlowerSpeciesResponse
 *
 * @apiSuccessExample Success 200
 * HTTP/1.1 200 OK
 * Content-Type: application/json
 * Pagination-Offset: 0
 * Pagination-Limit: 30
 * Pagination-Total: 2
 * Pagination-Filtered: 2
 *
 * [
 *   {
 *     "id": "021789b6-e16c-4aa0-9cf8-38812fbce49f",
 *     "commonName": "Lily",
 *     "scientificName": "Lilium carniolicum",
 *     "createdAt": "2016-01-01T09:30:15Z",
 *     "updatedAt": "2016-01-01T09:30:15Z"
 *   },
 *   {
 *     "id": "02a12646-ff2f-43c7-81d1-72be402d778c",
 *     "commonName": "Rose",
 *     "scientificName": "Rosa acicularis",
 *     "createdAt": "2016-01-01T09:32:15Z",
 *     "updatedAt": "2016-01-01T09:34:30Z"
 *   }
 * ]
 */
router.get('/', utils.notYetImplemented);

module.exports = router;

/**
 * @apiDefine FlowerSpeciesResponse
 *
 * @apiSuccess (Success 200/201) {String} id The identifier of the species resource.
 * @apiSuccess (Success 200/201) {String} commonName The common name of the species.
 * @apiSuccess (Success 200/201) {String} scientificName The scientific name of the species.
 * @apiSuccess (Success 200/201) {String} createdAt The date at which the species was created (ISO-8601).
 * @apiSuccess (Success 200/201) {String} updatedAt The date at which the species was last modified (ISO-8601).
 */
