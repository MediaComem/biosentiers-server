const _ = require('lodash');

function RouteHelper(req, res) {
  this.req = req;
  this.res = res;
}

const statuses = {
  created: 201,
  noContent: 204,
  ok: 200
};

_.each(statuses, (status, text) => {
  RouteHelper.prototype[text] = responder(status);
});

module.exports = RouteHelper;

function responder(status) {
  return function(data, serializer) {
    if (data) {
      this.res.status(status).send(serialize(this.req, data, serializer));
    } else {
      this.res.sendStatus(status);
    }
  };
}

function serialize(req, data, serializer) {
  if (!serializer) {
    return data;
  }

  if (_.isFunction(serializer.serialize)) {
    serializer = serializer.serialize;
  } else if (!_.isFunction(serializer)) {
    throw new Error('Serializer must be a function or have a "serialize" property that is a function');
  }

  if (!_.isArray(data)) {
    return serializer(req, data);
  } else {
    return _.map(data, (item) => serializer(req, item));
  }
}
