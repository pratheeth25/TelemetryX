'use strict';

/**
 * Static seed catalogue for the SkyTrack demo portfolio.
 * 3 organisations → 5 products → 15 pre-configured devices.
 * All data is intentionally generic / fictional.
 */

const ORGS = [
  { orgId: 'org-nexus',    name: 'Nexus Technologies',  plan: 'enterprise' },
  { orgId: 'org-meridian', name: 'Meridian Systems',    plan: 'pro'        },
  { orgId: 'org-vertex',   name: 'Vertex Innovations',  plan: 'starter'    },
];

const PRODUCTS = [
  // Nexus Technologies
  {
    productId: 'prod-nx-mobile',
    orgId: 'org-nexus',
    name: 'NX-7 Smart Phone',
    category: 'mobile',
    releaseDate: new Date('2024-03-01'),
    imageEmoji: '📱',
  },
  {
    productId: 'prod-nx-laptop',
    orgId: 'org-nexus',
    name: 'NX Pro Laptop',
    category: 'laptop',
    releaseDate: new Date('2024-06-15'),
    imageEmoji: '💻',
  },
  // Meridian Systems
  {
    productId: 'prod-md-wearable',
    orgId: 'org-meridian',
    name: 'Meridian Fit Watch',
    category: 'wearable',
    releaseDate: new Date('2023-11-20'),
    imageEmoji: '⌚',
  },
  {
    productId: 'prod-md-router',
    orgId: 'org-meridian',
    name: 'Meridian MeshRouter',
    category: 'router',
    releaseDate: new Date('2024-01-10'),
    imageEmoji: '📡',
  },
  // Vertex Innovations
  {
    productId: 'prod-vx-sensor',
    orgId: 'org-vertex',
    name: 'Vertex EnviroSensor',
    category: 'sensor',
    releaseDate: new Date('2023-08-05'),
    imageEmoji: '🌡️',
  },
];

/** 15 devices spread across the 5 products / 3 orgs */
const DEVICES = [
  // ── NX-7 Smart Phone (3 units) ──────────────────────────────────────────
  {
    deviceId: 'dev-nx-mob-01',
    orgId: 'org-nexus',
    productId: 'prod-nx-mobile',
    name: 'NX-7 Unit #1',
    firmwareVersion: '3.2.1',
    location: { lat: 37.7749, lng: -122.4194 },  // San Francisco
  },
  {
    deviceId: 'dev-nx-mob-02',
    orgId: 'org-nexus',
    productId: 'prod-nx-mobile',
    name: 'NX-7 Unit #2',
    firmwareVersion: '3.2.1',
    location: { lat: 40.7128, lng: -74.0060 },   // New York
  },
  {
    deviceId: 'dev-nx-mob-03',
    orgId: 'org-nexus',
    productId: 'prod-nx-mobile',
    name: 'NX-7 Unit #3',
    firmwareVersion: '3.1.9',
    location: { lat: 51.5074, lng: -0.1278 },    // London
  },

  // ── NX Pro Laptop (3 units) ──────────────────────────────────────────────
  {
    deviceId: 'dev-nx-lap-01',
    orgId: 'org-nexus',
    productId: 'prod-nx-laptop',
    name: 'NX Pro Laptop #1',
    firmwareVersion: '2.0.4',
    location: { lat: 48.8566, lng: 2.3522 },     // Paris
  },
  {
    deviceId: 'dev-nx-lap-02',
    orgId: 'org-nexus',
    productId: 'prod-nx-laptop',
    name: 'NX Pro Laptop #2',
    firmwareVersion: '2.0.4',
    location: { lat: 35.6762, lng: 139.6503 },   // Tokyo
  },
  {
    deviceId: 'dev-nx-lap-03',
    orgId: 'org-nexus',
    productId: 'prod-nx-laptop',
    name: 'NX Pro Laptop #3',
    firmwareVersion: '1.9.8',
    location: { lat: -33.8688, lng: 151.2093 },  // Sydney
  },

  // ── Meridian Fit Watch (3 units) ─────────────────────────────────────────
  {
    deviceId: 'dev-md-watch-01',
    orgId: 'org-meridian',
    productId: 'prod-md-wearable',
    name: 'Fit Watch #1',
    firmwareVersion: '1.5.0',
    location: { lat: 52.5200, lng: 13.4050 },    // Berlin
  },
  {
    deviceId: 'dev-md-watch-02',
    orgId: 'org-meridian',
    productId: 'prod-md-wearable',
    name: 'Fit Watch #2',
    firmwareVersion: '1.5.0',
    location: { lat: 19.0760, lng: 72.8777 },    // Mumbai
  },
  {
    deviceId: 'dev-md-watch-03',
    orgId: 'org-meridian',
    productId: 'prod-md-wearable',
    name: 'Fit Watch #3',
    firmwareVersion: '1.4.3',
    location: { lat: 55.7558, lng: 37.6173 },    // Moscow
  },

  // ── Meridian MeshRouter (3 units) ────────────────────────────────────────
  {
    deviceId: 'dev-md-rtr-01',
    orgId: 'org-meridian',
    productId: 'prod-md-router',
    name: 'MeshRouter #1',
    firmwareVersion: '4.1.2',
    location: { lat: 1.3521, lng: 103.8198 },    // Singapore
  },
  {
    deviceId: 'dev-md-rtr-02',
    orgId: 'org-meridian',
    productId: 'prod-md-router',
    name: 'MeshRouter #2',
    firmwareVersion: '4.1.2',
    location: { lat: 25.2048, lng: 55.2708 },    // Dubai
  },
  {
    deviceId: 'dev-md-rtr-03',
    orgId: 'org-meridian',
    productId: 'prod-md-router',
    name: 'MeshRouter #3',
    firmwareVersion: '4.0.9',
    location: { lat: -23.5505, lng: -46.6333 },  // São Paulo
  },

  // ── Vertex EnviroSensor (3 units) ────────────────────────────────────────
  {
    deviceId: 'dev-vx-sen-01',
    orgId: 'org-vertex',
    productId: 'prod-vx-sensor',
    name: 'EnviroSensor #1',
    firmwareVersion: '0.9.5',
    location: { lat: 59.9139, lng: 10.7522 },    // Oslo
  },
  {
    deviceId: 'dev-vx-sen-02',
    orgId: 'org-vertex',
    productId: 'prod-vx-sensor',
    name: 'EnviroSensor #2',
    firmwareVersion: '0.9.5',
    location: { lat: 41.9028, lng: 12.4964 },    // Rome
  },
  {
    deviceId: 'dev-vx-sen-03',
    orgId: 'org-vertex',
    productId: 'prod-vx-sensor',
    name: 'EnviroSensor #3',
    firmwareVersion: '0.9.1',
    location: { lat: 33.8869, lng: 9.5375 },     // Tunisia
  },
];

module.exports = { ORGS, PRODUCTS, DEVICES };
