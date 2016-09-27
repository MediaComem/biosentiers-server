var express = require('express'),
    utils = require('../utils');

var router = express.Router();

/**
 * @api {POST} /paths Create a path
 * @apiGroup Paths
 * @apiName CreatePath
 * @apiDescription Add a new path to a tour.
 *
 * @apiUse Authorization
 * @apiUse Validation
 * @apiUse PathResponse
 *
 * @apiParam (JSON parameters) {String} tourId The ID of the tour the path will be added to.
 * @apiParam (JSON parameters) {GeoJSON} geometry The path (must be a LineString).
 *
 * @apiExample Example
 * POST /api/v1/tours HTTP/1.1
 * Content-Type: application/json
 *
 * {
 *   "tourId": "c3b2540c-6249-4bd9-9245-91a120b15dcd",
 *   "geometry": {
 *     "type": "LineString",
 *     "coordinates": [
 *       [102.0, 2.0], [103.0, 2.0], [103.0, 3.0], [102.0, 3.0]
 *     ]
 *   }
 * }
 *
 * @apiSuccessExample Success 201
 * HTTP/1.1 201 Created
 * Content-Type: application/json
 *
 * {
 *   "id": "5cda0fa2-1fda-42cf-a7f7-cdf1b9274fcf",
 *   "tourId": "c3b2540c-6249-4bd9-9245-91a120b15dcd",
 *   "geometry": {
 *     "type": "LineString",
 *     "coordinates": [
 *       [102.0, 2.0], [103.0, 2.0], [103.0, 3.0], [102.0, 3.0]
 *     ]
 *   },
 *   "createdAt": "2016-01-01T09:30:15Z",
 *   "updatedAt": "2016-01-01T09:30:15Z"
 * }
 */
router.post('/', utils.notYetImplemented);

/**
 * @api {GET} /paths List paths
 * @apiName ListPaths
 * @apiGroup Paths
 *
 * @apiUse Pagination
 * @apiUse Authorization
 * @apiUse PathResponse
 *
 * @apiParam (Query parameters) {String} tourId List only paths in the tour with this ID.
 * @apiParamExample tourId
 * ?tourId=1086f5ba-51cd-4f94-ba3e-1b0239d452b0
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
 *     "id": "5cda0fa2-1fda-42cf-a7f7-cdf1b9274fcf",
 *     "tourId": "c3b2540c-6249-4bd9-9245-91a120b15dcd",
 *     "geometry": {
 *       "type": "LineString",
 *       "coordinates": [
 *         [102.0, 2.0], [103.0, 2.0], [103.0, 3.0], [102.0, 3.0]
 *       ]
 *     },
 *     "createdAt": "2016-01-01T09:30:15Z",
 *     "updatedAt": "2016-01-01T09:30:15Z"
 *   },
 *   {
 *     "id": "e73316c3-c6f2-467e-b187-e05f7c07cdbb",
 *     "tourId": "c3b2540c-6249-4bd9-9245-91a120b15dcd",
 *     "geometry": {
 *       "type": "LineString",
 *       "coordinates": [
 *         [100.2, 0.2], [100.8, 0.2], [100.8, 0.8], [100.2, 0.8], [100.2, 0.2]
 *       ]
 *     },
 *     "createdAt": "2016-01-01T09:32:15Z",
 *     "updatedAt": "2016-01-01T09:34:30Z"
 *   }
 * ]
 */
router.get('/', utils.notYetImplemented);

module.exports = router;

/**
 * @apiDefine PathResponse
 *
 * @apiSuccess (Success 200/201) {String} id The identifier of the path resource.
 * @apiSuccess (Success 200/201) {String} tourId The ID of the parent tour.
 * @apiSuccess (Success 200/201) {GeoJSON} geometry The path (a LineString).
 * @apiSuccess (Success 200/201) {Number} length The length of the path (in meters).
 * @apiSuccess (Success 200/201) {String} createdAt The date at which the path was created (ISO-8601).
 * @apiSuccess (Success 200/201) {String} updatedAt The date at which the path was last modified (ISO-8601).
 */
