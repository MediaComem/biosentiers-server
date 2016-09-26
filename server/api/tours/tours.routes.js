var express = require('express'),
    utils = require('../utils');

var router = express.Router();

/**
 * @api {POST} /tours Create a tour
 * @apiGroup Tours
 * @apiName CreateTour
 * @apiDescription Create a new BioSentiers tour.
 *
 * A tour is an area containing multiple points of interests and proposed paths to discover those points.
 *
 * @apiUse Authorization
 * @apiUse Validation
 * @apiUse TourResponse
 *
 * @apiParam (JSON parameters) {GeoJSON} geometry The area of the tour (must be a MultiPolygon).
 *
 * @apiExample Example
 * POST /api/v1/tours HTTP/1.1
 * Content-Type: application/json
 *
 * {
 *   "geometry": {
 *     "type": "MultiPolygon",
 *     "coordinates": [
 *       [ [ [102.0, 2.0], [103.0, 2.0], [103.0, 3.0], [102.0, 3.0], [102.0, 2.0] ] ]
 *     ]
 *   }
 * }
 *
 * @apiSuccessExample Success 201
 * HTTP/1.1 201 Created
 * Content-Type: application/json
 *
 * {
 *   "id": "1086f5ba-51cd-4f94-ba3e-1b0239d452b0",
 *   "geometry": {
 *     "type": "MultiPolygon",
 *     "coordinates": [
 *       [ [ [102.0, 2.0], [103.0, 2.0], [103.0, 3.0], [102.0, 3.0], [102.0, 2.0] ] ]
 *     ]
 *   },
 *   "createdAt": "2016-01-01T09:30:15Z",
 *   "updatedAt": "2016-01-01T09:30:15Z"
 * }
 */
router.post('/', utils.notYetImplemented);

module.exports = router;

/**
 * @apiDefine TourResponse
 *
 * @apiSuccess (Success 200/201) {String} id The identifier of the tour resource.
 * @apiSuccess (Success 200/201) {GeoJSON} geometry The area of the tour (a MultiPolygon).
 * @apiSuccess (Success 200/201) {String} createdAt The date at which the tour was created (ISO-8601).
 * @apiSuccess (Success 200/201) {String} updatedAt The date at which the tour was last modified (ISO-8601).
 */
