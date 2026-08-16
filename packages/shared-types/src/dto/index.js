/**
 * shared-types — src/dto/index.js
 * DTO (Data Transfer Object) yang dipakai bersama
 */

/**
 * Buat DTO response standar sukses
 * @param {*} data
 * @param {object} [pagination]
 */
function successResponse(data, pagination) {
  const resp = { data };
  if (pagination) resp.pagination = pagination;
  return resp;
}

/**
 * Buat DTO response error standar
 * @param {string} error  — kode error snake_case
 * @param {string} message — pesan human-readable
 */
function errorResponse(error, message) {
  return { error, message };
}

module.exports = { successResponse, errorResponse };
