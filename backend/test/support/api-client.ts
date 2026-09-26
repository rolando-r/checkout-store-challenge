import request from 'supertest';

export const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
export const api = () => request(BASE_URL);