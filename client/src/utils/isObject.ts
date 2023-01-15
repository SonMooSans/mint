export function isObject(value: object) {
  return Object.prototype.toString.call(value) === '[object Object]';
}
