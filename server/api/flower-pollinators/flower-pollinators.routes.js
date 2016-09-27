var express = require('express'),
    utils = require('../utils');

var router = express.Router();

/**
 * @api {POST} /flower-pollinators Create a flower pollinator
 * @apiGroup FlowerPollinators
 * @apiName CreateFlowerPollinator
 * @apiDescription Register a butterfly species as a pollinator for a flower species.
 *
 * @apiUse Authorization
 * @apiUse Validation
 * @apiUse FlowerPollinatorResponse
 *
 * @apiParam (JSON parameters) {String} butterflySpeciesId The ID of the butterfly species resource.
 * @apiParam (JSON parameters) {String} flowerSpeciesId The ID of the flower species resource.
 *
 * @apiExample Example
 * POST /api/v1/flower-pollinators HTTP/1.1
 * Content-Type: application/json
 *
 * {
 *   "butterflySpeciesId": "021789b6-e16c-4aa0-9cf8-38812fbce49f",
 *   "flowerSpeciesId": "b6eaf547-3f9b-41e2-a14c-f82dfb51b584"
 * }
 *
 * @apiSuccessExample Success 201
 * HTTP/1.1 201 Created
 * Content-Type: application/json
 *
 * {
 *   "butterflySpeciesId": "021789b6-e16c-4aa0-9cf8-38812fbce49f",
 *   "flowerSpeciesId": "b6eaf547-3f9b-41e2-a14c-f82dfb51b584"
 * }
 */
router.post('/', utils.notYetImplemented);

/**
 * @api {GET} /flower-pollinators List flower pollinators
 * @apiName ListFlowerPollinators
 * @apiGroup FlowerPollinators
 *
 * @apiUse Pagination
 * @apiUse Authorization
 * @apiUse FlowerPollinatorResponse
 *
 * @apiParam (Query parameters) {String} flowerSpeciesId List only pollinators for the flower species with that ID.
 * @apiParamExample flowerSpeciesId
 * ?flowerSpeciesId=b6eaf547-3f9b-41e2-a14c-f82dfb51b584
 *
 * @apiParam (Query parameters) {String} butterflySpeciesId List only pollinators for the butterfly species with that ID.
 * @apiParamExample butterflySpeciesId
 * ?butterflySpeciesId=021789b6-e16c-4aa0-9cf8-38812fbce49f
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
 *     "butterflySpeciesId": "021789b6-e16c-4aa0-9cf8-38812fbce49f",
 *     "flowerSpeciesId": "b6eaf547-3f9b-41e2-a14c-f82dfb51b584"
 *   },
 *   {
 *     "butterflySpeciesId": "d8ba0ca4-41e4-487c-876f-e9b245e73554",
 *     "flowerSpeciesId": "b6eaf547-3f9b-41e2-a14c-f82dfb51b584"
 *   }
 * ]
 */
router.get('/', utils.notYetImplemented);

module.exports = router;

/**
 * @apiDefine FlowerPollinatorResponse
 *
 * @apiSuccess (Success 200/201) {String} butterflySpeciesId The ID of the butterfly species resource.
 * @apiSuccess (Success 200/201) {String} flowerSpeciesId The ID of the flower species resource.
 */
