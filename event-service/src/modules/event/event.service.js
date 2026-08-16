/**
 * event-service — modules/event/event.service.js
 * Business logic untuk Event
 */
const db = require('../../database');
const eventRepo = require('./event.repository');
const seatCategoryRepo = require('../seat-category/seat-category.repository');

async function getCatalog(page, limit) {
  const offset = (page - 1) * limit;
  const [data, total] = await Promise.all([
    eventRepo.findCatalog(limit, offset),
    eventRepo.countCatalog(),
  ]);
  return { data, total };
}

async function getAllEvents() {
  return eventRepo.findAll();
}

async function getEventById(id) {
  const event = await eventRepo.findById(id);
  if (!event) return null;
  const categories = await seatCategoryRepo.findByEventId(id);
  return { ...event, categories };
}

async function createEvent({ name, venue, event_date, description, banner_url, categories = [] }) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const event = await eventRepo.create(client, { name, venue, event_date, description, banner_url });
    const cats = await seatCategoryRepo.bulkCreate(client, event.id, categories);
    await client.query('COMMIT');
    return { ...event, categories: cats };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateStatus(id, status) {
  return eventRepo.updateStatus(id, status);
}

module.exports = { getCatalog, getAllEvents, getEventById, createEvent, updateStatus };
