function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function stripMongoOperators(value) {
  if (Array.isArray(value)) {
    value.forEach(stripMongoOperators);
    return;
  }
  if (!isPlainObject(value)) return;

  for (const key of Object.keys(value)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete value[key];
      continue;
    }
    stripMongoOperators(value[key]);
  }
}

// A field like { "email": { "$ne": null } } is meant to smuggle a MongoDB
// query operator into a value that should be a plain string. Every field
// in this app is validated to a specific type before use, so this mostly
// adds defense in depth - but it means an operator key can never survive
// into a query even if a future route forgets to validate a field.
function sanitizeBody(req, res, next) {
  stripMongoOperators(req.body);
  next();
}

module.exports = { sanitizeBody };
