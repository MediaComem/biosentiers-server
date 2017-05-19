module.exports = function generator(func) {
  let counter = 0;
  return function() {
    return func(counter++);
  };
};
