import RSVP from "../models/RSVP.js";

export async function listRsvps(_request, response) {
  const rsvps = await RSVP.find().sort({ createdAt: -1 });
  response.json(rsvps);
}

export async function createRsvp(request, response) {
  const rsvp = await RSVP.create(request.body);
  response.status(201).json(rsvp);
}
