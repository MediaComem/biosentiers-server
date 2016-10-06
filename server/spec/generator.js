module.exports = function generator(func) {
  var counter = 0;
  return function() {
    return func(counter++);
  };
};
